import { getTopHeadlinesCached } from "@/lib/news-api";
import type { Article } from "@/lib/types";
import { NewsApp } from "@/components/NewsApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialArticles: Article[] = [];
  let apiError: string | null = null;

  try {
    initialArticles = await getTopHeadlinesCached("general");
  } catch (err) {
    apiError = err instanceof Error ? err.message : "Failed to load news";
  }

  return (
    <>
      {apiError && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Heads-up: {apiError}. Set <code className="font-mono">NEWSDATA_API_KEY</code> and
            reconnect to stream live stories.
          </div>
        </div>
      )}
      <NewsApp initialArticles={initialArticles} />
    </>
  );
}