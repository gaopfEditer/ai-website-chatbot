import type { RetrievalHit } from "../types";

export interface OfflineAnswerResult {
  kind: "answer" | "unknown";
  message: string;
  citations: { title: string; sourcePath: string }[];
}

export function buildOfflineAnswer(hits: RetrievalHit[], lowConfidence: boolean): OfflineAnswerResult {
  if (lowConfidence || hits.length === 0) {
    return {
      kind: "unknown",
      message:
        "I couldn't find that in our documentation. I don't want to guess — if you share your name, email, and what you're looking for, our team can follow up.",
      citations: [],
    };
  }

  const top = hits.slice(0, 2);
  const citations = top.map((h) => ({
    title: h.chunk.title,
    sourcePath: h.chunk.sourcePath,
  }));

  const excerpt = top[0].chunk.text.slice(0, 480);

  const sourceList = citations.map((c) => `• ${c.title} (${c.sourcePath})`).join("\n");

  const message = `Here's what our materials say:\n\n"${excerpt}${excerpt.length >= 480 ? "…" : ""}"\n\nSources:\n${sourceList}`;

  return { kind: "answer", message, citations };
}

export const BUYING_INTENT_PATTERN =
  /\b(book|schedule|appointment|quote|pricing|sign up|buy|purchase|get started|consultation|estimate)\b/i;

export function detectBuyingIntent(text: string): boolean {
  return BUYING_INTENT_PATTERN.test(text);
}
