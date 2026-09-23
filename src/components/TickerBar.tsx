import type { Article } from "@/lib/types";

export function TickerBar({ articles }: { articles: Article[] }) {
  const items = articles.slice(0, 14);
  if (items.length === 0) return null;

  const row = [...items, ...items];

  return (
    <div className="relative z-10 flex items-stretch overflow-hidden border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="z-10 flex shrink-0 items-center gap-2 border-r border-zinc-800 bg-zinc-900 px-4">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-live-dot" />
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Wire
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker flex w-max items-center gap-10 py-2.5 pl-6">
          {row.map((article, i) => (
            <span key={`${article.id}-${i}`} className="flex items-center gap-10">
              <span className="whitespace-nowrap text-sm text-zinc-300 hover:text-white">
                {article.title}
              </span>
              <span className="text-[var(--accent)]">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}