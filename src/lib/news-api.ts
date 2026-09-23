import { cache } from "react";
import { CATEGORIES } from "./types";
import type { Article, Category } from "./types";

// NewsData.io API categories for the /latest and /news endpoints.
// Maps our UI categories to their wire category names.
export const NEWSDATA_CATEGORY: Record<Category, string> = {
  general: "top",
  business: "business",
  entertainment: "entertainment",
  health: "health",
  science: "science",
  sports: "sports",
  technology: "technology",
};

const NEWSDATA_CATEGORY_LOOKUP: Record<string, Category> = {
  top: "general",
  world: "general",
  politics: "general",
  other: "general",
  regional: "general",
  business: "business",
  entertainment: "entertainment",
  health: "health",
  science: "science",
  sports: "sports",
  technology: "technology",
};

interface RawArticle {
  article_id: string | null;
  link: string;
  title: string;
  description: string | null;
  content: string | null;
  creator: string[] | null;
  language: string;
  country: string[];
  category: string[];
  pubDate: string;
  pubDateTZ: string;
  image_url: string | null;
  source_name: string | null;
}

function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + input.length.toString(36);
}

function toIso(pubDate: string, tz: string): string {
  const cleaned = pubDate.replace(" ", "T");
  const isUtc = tz?.toUpperCase() === "UTC";
  const parsed = new Date(isUtc ? `${cleaned}Z` : cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function inferCategory(tags: string[] | null | undefined, fallback: Category): Category {
  for (const tag of tags ?? []) {
    const mapped = NEWSDATA_CATEGORY_LOOKUP[tag.toLowerCase()];
    if (mapped) return mapped;
  }
  return fallback;
}

export function normalizeArticle(raw: RawArticle, requestedCategory: Category): Article {
  const category = inferCategory(raw.category, requestedCategory);
  return {
    id: raw.article_id ?? hashId(raw.link),
    source: raw.source_name ?? "Unknown",
    author: raw.creator?.[0] ?? null,
    title: raw.title,
    description: raw.description ?? "",
    url: raw.link,
    imageUrl: raw.image_url ?? null,
    publishedAt: toIso(raw.pubDate, raw.pubDateTZ),
    category,
    content: raw.content && !raw.content.includes("PAID PLANS") ? raw.content : "",
  };
}

const inMemoryCache = new Map<
  string,
  { articles: Article[]; expiresAt: number }
>();

function readCache(key: string): Article[] | null {
  const entry = inMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    inMemoryCache.delete(key);
    return null;
  }
  return entry.articles;
}

function writeCache(key: string, articles: Article[], ttlMs: number) {
  inMemoryCache.set(key, {
    articles,
    expiresAt: Date.now() + ttlMs,
  });
}

const NEWSAPI_DEFAULT_TTL_MS = 5 * 60 * 1000;

class NewsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchNewsData(params: URLSearchParams): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    throw new NewsApiError("NEWSDATA_API_KEY is not configured", 500);
  }

  const url = new URL("https://newsdata.io/api/1/latest");
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of params) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new NewsApiError(
      `NewsData responded ${res.status}: ${body.slice(0, 200)}`,
      res.status
    );
  }

  const data = (await res.json()) as { status: string; results?: RawArticle[] };
  if (data.status !== "success") {
    throw new NewsApiError("NewsData returned a non-success status", 502);
  }
  return data.results ?? [];
}

function dedupeAndTrim(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export async function fetchHeadlines(
  category: Category = "general",
  options: { cacheTtlMs?: number } = {}
): Promise<Article[]> {
  const key = `headlines:${category}`;
  const cached = readCache(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    country: "us",
    language: "en",
    size: "10",
    category: NEWSDATA_CATEGORY[category],
  });

  const raw = await fetchNewsData(params);
  const articles = dedupeAndTrim(raw.map((a) => normalizeArticle(a, category)));

  writeCache(key, articles, options.cacheTtlMs ?? NEWSAPI_DEFAULT_TTL_MS);
  return articles;
}

export async function searchNews(
  query: string,
  options: { cacheTtlMs?: number } = {}
): Promise<Article[]> {
  const key = `search:${query.toLowerCase().trim()}`;
  const cached = readCache(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    country: "us",
    language: "en",
    size: "10",
    q: query.trim().slice(0, 100),
  });

  const raw = await fetchNewsData(params);
  const articles = dedupeAndTrim(raw.map((a) => normalizeArticle(a, "general")));

  writeCache(key, articles, options.cacheTtlMs ?? NEWSAPI_DEFAULT_TTL_MS);
  return articles;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const diff = Date.now() - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const getTopHeadlinesCached = cache(fetchHeadlines);
export { CATEGORIES };