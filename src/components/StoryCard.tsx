import { CATEGORY_COLORS } from "@/lib/types";
import type { Article } from "@/lib/types";
import { formatRelativeTime } from "@/lib/news-api";

export function StoryCard({
  article,
  isNew,
  onOpen,
  rank,
}: {
  article: Article;
  isNew: boolean;
  onOpen: (article: Article) => void;
  rank: number;
}) {
  const color = CATEGORY_COLORS[article.category] ?? "#a855f7";
  const imageUrl = article.imageUrl;

  return (
    <article
      onClick={() => onOpen(article)}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-xl hover:shadow-black/40 ${
        isNew ? "animate-story-in" : ""
      }`}
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      {imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {isNew && (
            <span className="absolute left-3 top-3 rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-950">
              New
            </span>
          )}
        </div>
      ) : (
        <div className="relative flex h-14 items-end p-4">
          {isNew && (
            <span className="absolute right-3 top-3 rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-950">
              New
            </span>
          )}
          <div
            className="m-0 h-1.5 w-28 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span
            className="rounded px-1.5 py-0.5"
            style={{ color: color, backgroundColor: `${color}1a` }}
          >
            {article.category}
          </span>
          <span className="text-zinc-500">{article.source}</span>
        </div>

        <h3 className="font-display text-lg font-bold leading-snug text-zinc-50 group-hover:text-white">
          {article.title}
        </h3>

        {article.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">
            {article.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-zinc-500">
          <span>{formatRelativeTime(article.publishedAt)}</span>
          <span className="font-mono text-zinc-600">#{rank.toString().padStart(2, "0")}</span>
        </div>
      </div>
    </article>
  );
}