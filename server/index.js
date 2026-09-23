import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.NEWSDATA_API_KEY;
const POLL_MS = Number(process.env.POLL_MS || 5 * 60 * 1000);
const WARM_POLL_MS = Number(process.env.WARM_POLL_MS || 30 * 60 * 1000);
const MAX_ARTICLES = 200;

const ALL_CATEGORIES = ["environment"];

// When clients are connected, poll only these categories (1 NewsData credit
// each; free plan = 200 credits/day, 30 credits/15 min).
const ACTIVE_CATEGORIES =
  (process.env.ACTIVE_CATEGORIES || "environment")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

function hashId(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + input.length.toString(36);
}

function toIso(pubDate, tz) {
  const cleaned = String(pubDate).replace(" ", "T");
  const isUtc = String(tz).toUpperCase() === "UTC";
  const parsed = new Date(isUtc ? `${cleaned}Z` : cleaned);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

// The platform only surfaces environmental news, so every NewsData tag
// collapses to the "environment" topic.
const KNOWN_CATEGORY_LOOKUP = {
  top: "environment",
  world: "environment",
  politics: "environment",
  other: "environment",
  regional: "environment",
  business: "environment",
  entertainment: "environment",
  health: "environment",
  science: "environment",
  sports: "environment",
  technology: "environment",
  environment: "environment",
};

function normalize(raw, fallbackCategory) {
  let category = fallbackCategory;
  for (const tag of raw.category || []) {
    const mapped = KNOWN_CATEGORY_LOOKUP[String(tag).toLowerCase()];
    if (mapped) {
      category = mapped;
      break;
    }
  }
  const content =
    raw.content && !String(raw.content).includes("PAID PLANS") ? raw.content : "";
  return {
    id: raw.article_id || hashId(raw.link),
    source: raw.source_name || "Unknown",
    author: Array.isArray(raw.creator) && raw.creator.length ? raw.creator[0] : null,
    title: raw.title,
    description: raw.description || "",
    url: raw.link,
    imageUrl: raw.image_url || null,
    publishedAt: toIso(raw.pubDate, raw.pubDateTZ),
    category,
    content,
  };
}

class NewsStore {
  constructor() {
    this.articles = new Map();
    this.order = [];
  }

  add(article) {
    if (this.articles.has(article.id)) return false;
    this.articles.set(article.id, article);
    this.order.unshift(article.id);
    if (this.order.length > MAX_ARTICLES) {
      const drop = this.order.pop();
      this.articles.delete(drop);
    }
    return true;
  }

  merge(articles) {
    const fresh = [];
    for (const article of articles) {
      if (this.add(article)) fresh.push(article);
    }
    return fresh;
  }

  snapshot() {
    return this.order.map((id) => this.articles.get(id));
  }
}

async function pollCategory(store, category) {
  if (!API_KEY) {
    console.error("NEWSDATA_API_KEY is not configured on the WS server.");
    return [];
  }
  try {
    const url = new URL("https://newsdata.io/api/1/latest");
    url.searchParams.set("apikey", API_KEY);
    url.searchParams.set("country", "us");
    url.searchParams.set("language", "en");
    url.searchParams.set("size", "10");
    url.searchParams.set("category", category);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error(`[${category}] NewsData ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (data.status !== "success") {
      console.error(`[${category}] NewsData status: ${data.status}`);
      return [];
    }
    const fallback = KNOWN_CATEGORY_LOOKUP[category] || "environment";
    const articles = (data.results || []).map((a) => normalize(a, fallback));
    const fresh = store.merge(articles);
    if (fresh.length) {
      console.log(
        `[${new Date().toISOString()}] ${category}: +${fresh.length} new, ${store.snapshot().length} total`
      );
    }
    return fresh;
  } catch (err) {
    console.error(`[${category}] poll failed:`, err.message);
    return [];
  }
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, clients: wss.clients.size }));
});

const wss = new WebSocketServer({ server, path: "/ws" });
const store = new NewsStore();

let rotationIndex = 0;

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

async function poll() {
  const hasClients = wss.clients.size > 0;
  let fresh = [];

  if (hasClients) {
    for (const category of ACTIVE_CATEGORIES) {
      const hits = await pollCategory(store, category);
      fresh = fresh.concat(hits);
    }
  } else {
    const category = ALL_CATEGORIES[rotationIndex % ALL_CATEGORIES.length];
    rotationIndex++;
    fresh = await pollCategory(store, category);
  }

  if (fresh.length > 0 && wss.clients.size > 0) {
    broadcast({ type: "news", articles: fresh });
  }
}

wss.on("connection", (socket) => {
  console.log("[ws] client connected, total:", wss.clients.size);
  socket.send(
    JSON.stringify({
      type: "snapshot",
      articles: store.snapshot(),
      total: store.snapshot().length,
    })
  );
  socket.on("close", () => console.log("[ws] client disconnected"));
  socket.on("error", () => {});
});

const heartbeat = setInterval(() => {
  broadcast({ type: "ping" });
}, 30_000);

let pollTimer;
function schedule() {
  const interval = wss.clients.size > 0 ? POLL_MS : WARM_POLL_MS;
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    await poll();
    schedule();
  }, interval);
}

server.listen(PORT, () => {
  console.log(`[ws] live news broadcaster on ws://0.0.0.0:${PORT}/ws`);
  schedule();
  poll();
});

process.on("SIGTERM", () => {
  clearInterval(heartbeat);
  clearTimeout(pollTimer);
  wss.close();
  server.close();
  process.exit(0);
});