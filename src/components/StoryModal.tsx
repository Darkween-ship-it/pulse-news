"use client";

import { useEffect } from "react";
import { CATEGORY_COLORS } from "@/lib/types";
import type { Article } from "@/lib/types";
import { formatRelativeTime } from "@/lib/news-api";

export function StoryModal({
  article,
  onClose,
}: {
  article: Article | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!article) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [article, onClose]);

  if (!article) return null;

  const color = CATEGORY_COLORS[article.category] ?? "#a855f7";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="animate-fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {article.imageUrl && (
          <div className="relative h-56 w-full overflow-hidden sm:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
          </div>
        )}

        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span
              className="rounded px-1.5 py-0.5"
              style={{ color, backgroundColor: `${color}1a` }}
            >
              {article.category}
            </span>
            <span className="text-zinc-500">{article.source}</span>
            <span className="text-zinc-600">· {formatRelativeTime(article.publishedAt)}</span>
          </div>

          <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
            {article.title}
          </h2>

          {article.author && (
            <p className="mt-3 text-sm text-zinc-400">
              By <span className="font-medium text-zinc-200">{article.author}</span>
            </p>
          )}

          {article.description && (
            <p className="mt-4 text-base leading-relaxed text-zinc-300">
              {article.description}
            </p>
          )}

          {article.content && (
            <p className="mt-3 text-base leading-relaxed text-zinc-400">
              {article.content.replace(/\[\+\d+ chars\]$/, "")}
            </p>
          )}

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-display text-sm font-bold text-zinc-950 transition hover:brightness-110"
          >
            Read full story
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}