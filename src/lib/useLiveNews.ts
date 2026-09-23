"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Article, Topic, WsMessage } from "@/lib/types";

type Status = "connecting" | "live" | "fallback";

export interface LiveNewsState {
  articles: Article[];
  status: Status;
  liveCount: number;
  lastUpdated: Date | null;
  newIds: string[];
  acknowledge: () => void;
  fetchMore: (params: { category?: Topic; q?: string }) => Promise<void>;
}

const POLL_MS = 20_000;

export function mergeArticles(existing: Article[], incoming: Article[]): Article[] {
  const map = new Map<string, Article>();
  for (const article of existing) map.set(article.id, article);
  for (const article of incoming) map.set(article.id, article);
  return [...map.values()].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)
  );
}

function wsUrlForBrowser(): string | null {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }
  return null;
}

export function useLiveNews(initial: Article[], topic: Topic | "all") {
  const [articles, setArticles] = useState(initial);
  const [status, setStatus] = useState<Status>("connecting");
  const [liveCount, setLiveCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newIds, setNewIds] = useState<string[]>([]);
  const topicRef = useRef<Topic | "all">(topic);
  const seenRef = useRef<Set<string>>(new Set(initial.map((a) => a.id)));

  useEffect(() => {
    topicRef.current = topic;
  }, [topic]);

  const applyIncoming = useCallback((incoming: Article[], markFresh = true) => {
    const fresh = incoming.filter((a) => !seenRef.current.has(a.id));
    for (const a of incoming) seenRef.current.add(a.id);
    if (fresh.length > 0) {
      if (markFresh) {
        setLiveCount((c) => c + fresh.length);
        setNewIds((ids) => [...ids, ...fresh.map((a) => a.id)]);
      }
      setLastUpdated(new Date());
      setArticles((prev) => mergeArticles(prev, fresh));
    }
  }, []);

  const acknowledge = useCallback(() => {
    setLiveCount(0);
    setNewIds([]);
  }, []);

  const fetchMore = useCallback(
    async (params: { category?: Topic; q?: string }) => {
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      else if (params.category) sp.set("category", params.category);
      try {
        const res = await fetch(
          `/api/news${sp.size ? `?${sp.toString()}` : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { articles: Article[] };
        applyIncoming(data.articles);
      } catch {
        /* keep current pool */
      }
    },
    [applyIncoming]
  );

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;

    const startPolling = () => {
      if (pollTimer) return;
      if (disposed) return;
      setStatus("fallback");
      const poll = async () => {
        try {
          const q = topicRef.current === "all" ? "" : `category=${topicRef.current}`;
          const res = await fetch(`/api/news${q ? `?${q}` : ""}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = (await res.json()) as { articles: Article[] };
          applyIncoming(data.articles);
        } catch {
          /* keep last feed */
        }
      };
      void poll();
      pollTimer = setInterval(poll, POLL_MS);
    };

    const connect = () => {
      const url = wsUrlForBrowser();
      if (!url) {
        startPolling();
        return;
      }
      setStatus("connecting");
      try {
        socket = new WebSocket(url);
      } catch {
        startPolling();
        return;
      }

      socket.onopen = () => {
        retries = 0;
        setStatus("live");
      };

      socket.onmessage = (event) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (msg.type === "snapshot") {
          applyIncoming(msg.articles, false);
          setStatus("live");
        } else if (msg.type === "news") {
          applyIncoming(msg.articles);
        }
      };

      socket.onerror = () => {
        if (pollTimer) return;
        startPolling();
      };

      socket.onclose = () => {
        if (disposed) return;
        startPolling();
        retries += 1;
        reconnectTimer = setTimeout(() => {
          if (!disposed && retries < 5) connect();
        }, Math.min(30_000, 1000 * 2 ** retries));
      };
    };

    connect();
    return () => {
      disposed = true;
      if (socket) socket.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [applyIncoming]);

  const memo = useMemo<LiveNewsState>(
    () => ({ articles, status, liveCount, lastUpdated, newIds, acknowledge, fetchMore }),
    [articles, status, liveCount, lastUpdated, newIds, acknowledge, fetchMore]
  );
  return memo;
}