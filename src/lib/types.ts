export type Category =
  | "general"
  | "business"
  | "entertainment"
  | "health"
  | "science"
  | "sports"
  | "technology";

export const CATEGORIES: Category[] = [
  "general",
  "business",
  "entertainment",
  "health",
  "science",
  "sports",
  "technology",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  general: "#f43f5e",
  business: "#f59e0b",
  entertainment: "#a855f7",
  health: "#10b981",
  science: "#3b82f6",
  sports: "#06b6d4",
  technology: "#f97316",
};

export interface Article {
  id: string;
  source: string;
  author: string | null;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  category: Category;
  content: string | null;
}

export interface StoredArticle extends Article {
  firstSeenAt: string;
}

export type WsMessage =
  | { type: "snapshot"; articles: Article[]; total: number }
  | { type: "news"; articles: Article[] }
  | { type: "ping" };