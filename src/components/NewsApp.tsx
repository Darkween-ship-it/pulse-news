"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TOPICS, TOPIC_COLORS } from "@/lib/types";
import type { Article, Topic } from "@/lib/types";
import { useLiveNews } from "@/lib/useLiveNews";
import { TickerBar } from "@/components/TickerBar";
import { StoryCard } from "@/components/StoryCard";
import { StoryModal } from "@/components/StoryModal";

const TOPIC_KEYWORDS: Record<Exclude<Topic, "environment">, string[]> = {
  climate: [
    "climate", "warming", "carbon", "emission", "greenhouse", "heatwave",
    "drought", "sea level", "glacier", "fossil fuel", "methane",
  ],
  energy: [
    "energy", "solar", "wind", "renewable", "electric", "battery", "grid",
    "nuclear", "coal", "gas", "hydrogen", "power plant", "evs",
  ],
  wildlife: [
    "wildlife", "species", "animal", "endangered", "bird", "whale", "fish",
    "forest", "habitat", "conservation", "ecosystem", "biodiversity",
    "insect", "bee", "coral", "elephant", "panda", "wolf",
  ],
  oceans: [
    "ocean", "sea", "marine", "coast", "beach", "reef", "water", "river",
    "lake", "wetland", "mangrove", "shore", "sewage",
  ],
  pollution: [
    "pollution", "plastic", "waste", "toxic", "emission", "smog", "sewage",
    "chemical", "trash", "contamin", "spill", "landfill", "recycl",
  ],
  weather: [
    "weather", "forecast", "storm", "rain", "snow", "heat", "cold",
    "hurricane", "temperature", "flood", "wildfire", "tornado", "wildfire",
  ],
};

const FILTER_TOPICS = TOPICS.filter((t) => t !== "environment");

function matchesTopic(article: Article, topic: Exclude<Topic, "environment">): boolean {
  if (article.category === topic) return true;
  const haystack = `${article.title} ${article.description}`.toLowerCase();
  return TOPIC_KEYWORDS[topic].some((k) => haystack.includes(k));
}

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
  const [topic, setTopic] = useState<Topic | "all">("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Article | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const { articles, status, liveCount, lastUpdated, newIds, acknowledge, fetchMore } =
    useLiveNews(initialArticles, topic);

  useEffect(() => {
    if (topic !== "all") void fetchMore({ category: topic });
  }, [topic, fetchMore]);

  const applyAndAcknowledge = () => {
    acknowledge();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const newIdSet = useMemo(() => new Set(newIds), [newIds]);

  const visible = useMemo(() => {
    let list = articles;
    if (topic !== "all") {
      list = list.filter((a) => matchesTopic(a, topic as Exclude<Topic, "environment">));
    }
    list = list.filter((a) => matchesQuery(a, query));
    return list;
  }, [articles, topic, query]);

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
                <path d="M12 2c1 3 4 4 4 8 0 4-2.5 6-4 6V2Z" />
                <path d="M5 10c-1 2-1 4-1 6 0 3 2 5 4 5h8c2 0 4-2 4-5 0-1 0-2-.5-3.5-2 .5-3 .5-4.5-.5-2 1.5-5 2-10-2Z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-white">
                Pulse<span className="text-[var(--accent)]"> Earth</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Environmental news live
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
              onClick={() => setTopic("all")}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                topic === "all"
                  ? "border-transparent bg-white text-zinc-950"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              All
            </button>
            {FILTER_TOPICS.map((t) => {
              const color = TOPIC_COLORS[t];
              const active = topic === t;
              return (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    active ? "border-transparent" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                  style={active ? { backgroundColor: color, color: "#0a0e1a" } : undefined}
                >
                  {t}
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
              placeholder="Search environmental news…"
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
              {visible.length} environmental stories on the wire
            </span>
            <span className="text-[11px] uppercase tracking-widest text-zinc-600">
              {topic}&nbsp;/&nbsp;{query || "environment"}
            </span>
          </div>
        )}
      </div>

      {/* Feed */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <span className="text-5xl">🌍</span>
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
          Pulse Earth — environmental news
        </p>
        <p>
          WebSocket pushed · {articles.length} cached stories · News via NewsData.io
        </p>
      </footer>

      <StoryModal article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}