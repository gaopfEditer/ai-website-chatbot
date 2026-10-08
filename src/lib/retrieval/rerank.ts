import type { DocumentChunk } from "../types";
import { detectIntents, tokenize, type SearchIntent } from "./query-processing";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function chunkHaystack(chunk: DocumentChunk): string {
  return `${chunk.heading ?? ""} ${chunk.title} ${chunk.sourcePath} ${chunk.text}`.toLowerCase();
}

function headingMatches(chunk: DocumentChunk, pattern: RegExp): boolean {
  const h = (chunk.heading ?? "").toLowerCase();
  return pattern.test(h);
}

/** Intent-aware adjustments on top of MiniSearch score. */
export function intentRerankBonus(chunk: DocumentChunk, query: string, intents: Set<SearchIntent>): number {
  let bonus = 0;
  const hay = chunkHaystack(chunk);
  const qTokens = tokenize(query);

  for (const t of qTokens) {
    if (hay.includes(t)) bonus += 0.8;
  }

  if (intents.has("hours")) {
    if (headingMatches(chunk, /office hours|hours/)) bonus += 18;
    if (WEEKDAYS.some((d) => hay.includes(d) && chunk.text.includes("|"))) bonus += 8;
    if (headingMatches(chunk, /holiday/)) {
      if (!/\b(holiday|thanksgiving|christmas|new year|independence)\b/i.test(query)) {
        bonus -= 14;
      }
    }
    if (/insurance-faq|insurance/i.test(chunk.sourcePath) && !intents.has("insurance")) {
      if (/\bopen\b/i.test(query) && /\bopen access\b/i.test(hay)) bonus -= 20;
      else bonus -= 6;
    }
    for (const d of WEEKDAYS) {
      if (query.toLowerCase().includes(d) && hay.includes(d)) bonus += 10;
    }
  }

  if (intents.has("insurance")) {
    if (headingMatches(chunk, /insurance|billing|payment without/)) bonus += 14;
    if (/insurance-faq/i.test(chunk.sourcePath)) bonus += 4;
  }

  if (intents.has("price")) {
    if (/\$|\bfrom \$/i.test(chunk.text)) bonus += 6;
    if (/services\.md/i.test(chunk.sourcePath)) bonus += 5;
  }

  if (intents.has("booking")) {
    if (headingMatches(chunk, /book|appointment/)) bonus += 16;
    if (/faq\.html/i.test(chunk.sourcePath)) bonus += 3;
  }

  if (intents.has("location")) {
    if (headingMatches(chunk, /parking|location|hours/)) bonus += 8;
    if (/oakview|412/i.test(chunk.text)) bonus += 6;
  }

  if (intents.has("emergency")) {
    if (headingMatches(chunk, /emergency/)) bonus += 18;
  }

  if (intents.has("kids")) {
    if (headingMatches(chunk, /children|child/)) bonus += 18;
  }

  if (/\bcancel/i.test(query)) {
    if (headingMatches(chunk, /cancellation/)) bonus += 20;
  }

  if (/\bpayment plan|financing|careplan/i.test(query)) {
    if (/careplan|financing/i.test(hay)) bonus += 14;
  }

  return bonus;
}

export function combinedScore(
  miniScore: number,
  chunk: DocumentChunk,
  query: string
): number {
  const intents = detectIntents(query);
  return miniScore + intentRerankBonus(chunk, query, intents);
}
