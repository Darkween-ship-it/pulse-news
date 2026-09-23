export type Topic =
  | "environment"
  | "climate"
  | "energy"
  | "wildlife"
  | "oceans"
  | "pollution"
  | "weather";

export const TOPICS: Topic[] = [
  "environment",
  "climate",
  "energy",
  "wildlife",
  "oceans",
  "pollution",
  "weather",
];

export const TOPIC_COLORS: Record<Topic, string> = {
  environment: "#10b981",
  climate: "#f59e0b",
  energy: "#facc15",
  wildlife: "#22c55e",
  oceans: "#0ea5e9",
  pollution: "#ef4444",
  weather: "#38bdf8",
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
  category: Topic;
  content: string | null;
}

export interface StoredArticle extends Article {
  firstSeenAt: string;
}

export type WsMessage =
  | { type: "snapshot"; articles: Article[]; total: number }
  | { type: "news"; articles: Article[] }
  | { type: "ping" };