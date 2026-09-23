import { NextRequest } from "next/server";
import { fetchHeadlines, searchNews } from "@/lib/news-api";
import { TOPICS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const query = searchParams.get("q");

  try {
    if (query && query.trim().length > 0) {
      const articles = await searchNews(query.trim());
      return Response.json({ articles, total: articles.length });
    }

    const safe = TOPICS.includes(category as never)
      ? (category as never)
      : "environment";
    const articles = await fetchHeadlines(safe);
    return Response.json({ articles, total: articles.length, category: safe });
  } catch (err) {
    const status = err instanceof Error && "status" in err ? (err as { status: number }).status : 502;
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch news" },
      { status }
    );
  }
}