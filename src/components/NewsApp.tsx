"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/types";
import type { Article, Category } from "@/lib/types";
import { useLiveNews } from "@/lib/useLiveNews";
import { TickerBar } from "@/components/TickerBar";
import { StoryCard } from "@/components/StoryCard";
import { StoryModal } from "@/components/StoryModal";

function matchesQuery(article: Article, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    article.title.toLowerCase().includes(q) ||
    article.description.toLowerCase().includes(q) ||
    article.source.toLowerCase().includes(q)
  );
}

export function NewsApp({ initialArticles }: { initialArticles: Article[] }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Article | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const { articles, status, liveCount, lastUpdated, newIds, acknowledge, fetchMore } =
    useLiveNews(initialArticles, category);

  useEffect(() => {
    if (category !== "all") void fetchMore({ category });
  }, [category, fetchMore]);

  const applyAndAcknowledge = () => {
    acknowledge();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const newIdSet = useMemo(() => new Set(newIds), [newIds]);

  const visible = useMemo(() => {
    let list = articles;
    if (category !== "all") {
      list = list.filter((a) => a.category === category);
    }
    list = list.filter((a) => matchesQuery(a, query));
    return list;
  }, [articles, category, query]);

  return (
    <div className="min-h-screen">
      <div ref={topRef} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-zinc-950"
                fill="currentColor"
                aria-hidden
              >
                <path d="M3 9h18v2H3zm0 4h18v2H3zm0 4h18v2H3zM3 5h18v2H3z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-white">
                Pulse<span className="text-[var(--accent)]">.</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Real-time news
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-[11px] text-zinc-500 sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <span
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${
                status === "live"
                  ? "border-[var(--accent)]/40 text-[var(--accent)]"
                  : status === "fallback"
                    ? "border-amber-500/40 text-amber-400"
                    : "border-zinc-700 text-zinc-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "live" ? "bg-[var(--accent)] animate-live-dot" : "bg-current animate-blink"
                }`}
              />
              {status === "live" ? "Live" : status === "fallback" ? "Auto-refresh" : "Connecting"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                category === "all"
                  ? "border-transparent bg-white text-zinc-950"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => {
              const color = CATEGORY_COLORS[c];
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    active ? "border-transparent" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                  style={active ? { backgroundColor: color, color: "#0a0e1a" } : undefined}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(searchInput);
              if (searchInput.trim()) void fetchMore({ q: searchInput });
            }}
            className="relative"
          >
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search headlines, sources, topics…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-28 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-zinc-600 focus:bg-zinc-800/80"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-100 px-4 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-white"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <TickerBar articles={articles} />

      {/* Breaking news bar */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {liveCount > 0 ? (
          <button
            onClick={applyAndAcknowledge}
            className="animate-story-in flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-3 text-sm font-bold text-[var(--accent)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-live-dot" />
            {liveCount} new {liveCount === 1 ? "story" : "stories"} just arrived — tap to view
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <span className="text-sm font-semibold text-zinc-300">
              {visible.length} stories on the wire
            </span>
            <span className="text-[11px] uppercase tracking-widest text-zinc-600">
              {category}&nbsp;/&nbsp;{query || "top"}
            </span>
          </div>
        )}
      </div>

      {/* Feed */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <span className="text-5xl">📡</span>
            <p className="font-display text-xl font-bold text-zinc-300">
              No stories match — searching…</p>
            <p className="text-sm text-zinc-500">New heads will stream in automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((article, index) => (
              <StoryCard
                key={article.id}
                article={article}
                rank={index + 1}
                isNew={newIdSet.has(article.id)}
                onOpen={setSelected}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-600">
        <p className="mb-1 font-display font-bold uppercase tracking-[0.3em] text-zinc-500">
          Pulse — real-time news
        </p>
        <p>
          WebSocket pushed · {articles.length} cached stories · News via NewsData.io
        </p>
      </footer>

      <StoryModal article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}