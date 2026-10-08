import type { RetrievalHit } from "../types";
import { tokenize } from "../retrieval/query-processing";

export interface OfflineAnswerResult {
  kind: "answer" | "unknown";
  message: string;
  citations: { title: string; sourcePath: string }[];
}

const WEEKDAYS =
  /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i;

function pickExcerpt(text: string, query: string, maxLen = 340): string {
  const qLower = query.toLowerCase();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (WEEKDAYS.test(qLower)) {
      const day = qLower.match(WEEKDAYS)?.[0];
      if (day && trimmed.toLowerCase().includes(day)) {
        return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
      }
    }
  }

  const qTokens = tokenize(query);
  const segments = text.split(/\n{2,}|(?<=[.!?])\s+/).filter((s) => s.trim());
  let best = segments[0] ?? text;
  let bestScore = -1;
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    let score = 0;
    for (const t of qTokens) {
      if (lower.includes(t)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = seg;
    }
  }

  const oneLine = best.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen)}…`;
}

export function buildOfflineAnswer(
  hits: RetrievalHit[],
  lowConfidence: boolean,
  query = ""
): OfflineAnswerResult {
  if (lowConfidence || hits.length === 0) {
    return {
      kind: "unknown",
      message:
        "I couldn't find that in our documentation. I don't want to guess — if you share your name, email, and what you're looking for, our team can follow up.",
      citations: [],
    };
  }

  const top = hits[0];
  const citation = {
    title: top.chunk.heading || top.chunk.title,
    sourcePath: top.chunk.sourcePath,
  };

  const excerpt = pickExcerpt(top.chunk.text, query);

  const message = `Here's what our materials say:\n\n"${excerpt}"\n\nSource: ${citation.title} (${citation.sourcePath})`;

  return { kind: "answer", message, citations: [citation] };
}

export const BUYING_INTENT_PATTERN =
  /\b(book|schedule|appointment|quote|pricing|sign up|buy|purchase|get started|consultation|estimate)\b/i;

export function detectBuyingIntent(text: string): boolean {
  return BUYING_INTENT_PATTERN.test(text);
}
