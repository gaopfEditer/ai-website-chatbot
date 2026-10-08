import type { RetrievalHit } from "../types";
import { collectExpandedTokens, tokenize } from "../retrieval/query-processing";

export interface OfflineAnswerResult {
  kind: "answer" | "unknown";
  message: string;
  citations: { title: string; sourcePath: string }[];
}

const WEEKDAY_RE =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

function isMarkdownHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line.trim());
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  return /^\|?[\s:-]+\|[\s|:-]+$/.test(t) || /^\|[-:\s|]+\|$/.test(t);
}

function formatTableRow(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  if (isTableSeparator(trimmed)) return null;
  const cells = trimmed
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  if (cells.length < 2) return null;
  if (/^day$/i.test(cells[0])) return null;
  if (/^[-:\s]+$/.test(cells[0]) || /^[-:\s]+$/.test(cells[1])) return null;
  const day = cells[0];
  const hours = cells.slice(1).join(", ");
  return `${day}: ${hours}`;
}

function extractHoursTable(text: string): string[] {
  const rows: string[] = [];
  for (const line of text.split("\n")) {
    const formatted = formatTableRow(line);
    if (formatted) rows.push(formatted);
  }
  return rows;
}

function detectWeekdayInQuery(query: string): string | undefined {
  return query.toLowerCase().match(WEEKDAY_RE)?.[1];
}

function queryMentionsHours(query: string): boolean {
  const lower = query.toLowerCase();
  return (
    WEEKDAY_RE.test(lower) ||
    /\b(hours?|opening|open|close[sd]?|schedule|office hours)\b/i.test(lower)
  );
}

function contentLines(text: string): string[] {
  return text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (isMarkdownHeading(trimmed)) return false;
    if (isTableSeparator(trimmed)) return false;
    return true;
  });
}

function pickExcerpt(text: string, query: string, maxLen = 340): string {
  if (queryMentionsHours(query)) {
    const day = detectWeekdayInQuery(query);
    const rows = extractHoursTable(text);
    if (rows.length > 0) {
      if (day) {
        const row = rows.find((r) => r.toLowerCase().startsWith(`${day}:`));
        if (row) return row.length > maxLen ? `${row.slice(0, maxLen)}…` : row;
      }
      const block = rows.join("; ");
      if (block.length <= maxLen) return block;
      return `${block.slice(0, maxLen)}…`;
    }
  }

  const qTokens = [...new Set([...tokenize(query), ...collectExpandedTokens(query)])];
  const segments = text
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && !isMarkdownHeading(s) && !/^#{1,6}\s/.test(s));

  const lineSegments = contentLines(text).filter((line) => !line.startsWith("|"));
  const candidates = [...segments, ...lineSegments];

  let best = candidates.find((s) => !isMarkdownHeading(s) && s.length > 0) ?? text;
  let bestScore = -1;
  for (const seg of candidates) {
    if (isMarkdownHeading(seg)) continue;
    const lower = seg.toLowerCase();
    let score = 0;
    for (const t of qTokens) {
      if (lower.includes(t)) score += 1;
    }
    if (/^[-*•]\s+/.test(seg.trim())) score += 1.5;
    const lenPenalty = seg.length < 20 ? -0.5 : 0;
    if (score + lenPenalty > bestScore) {
      bestScore = score + lenPenalty;
      best = seg;
    }
  }

  let excerptBody = best.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (/:\s*$/.test(excerptBody)) {
    const bullets = contentLines(text)
      .filter((l) => /^[-*•]\s+/.test(l.trim()))
      .map((l) => l.replace(/^[-*•]\s+/, "").trim());
    if (bullets.length > 0) {
      excerptBody = `${excerptBody.replace(/:\s*$/, ":")} ${bullets.join("; ")}`;
    }
  }

  const formattedRow = formatTableRow(best);
  const excerpt = formattedRow ?? excerptBody;
  if (excerpt.length <= maxLen) return excerpt;
  return `${excerpt.slice(0, maxLen)}…`;
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

/** True when the quoted answer is only a markdown heading (regression guard for tests). */
export function excerptLooksLikeHeadingOnly(message: string): boolean {
  const match = message.match(/"([^"]+)"/);
  if (!match) return false;
  const quoted = match[1].trim();
  return /^#{1,6}\s+/.test(quoted) || /^[A-Z][^:]{0,80}\?$/.test(quoted) && quoted.length < 60;
}
