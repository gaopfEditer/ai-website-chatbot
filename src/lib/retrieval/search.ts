import fs from "fs";
import MiniSearch from "minisearch";
import type { DocumentChunk, IndexedStore, RetrievalHit } from "../types";
import { indexPath } from "../paths";
import {
  collectExpandedTokens,
  countMatchingQueryTokens,
  expandQueries,
  tokenize,
  tokenMatchesDocument,
} from "./query-processing";
import { chunkAlignsWithQueryIntent, combinedScore } from "./rerank";
import { isStopword } from "./stopwords";

function buildMiniSearch(chunks: DocumentChunk[]): MiniSearch<DocumentChunk> {
  const ms = new MiniSearch({
    idField: "id",
    fields: ["text", "title", "heading", "sourcePath"],
    storeFields: ["id", "sourceId", "title", "heading", "sourcePath", "text"],
    processTerm: (term) => {
      const lower = term.toLowerCase();
      if (isStopword(lower)) return null;
      return lower;
    },
    searchOptions: {
      boost: { title: 2, heading: 5, sourcePath: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  ms.addAll(chunks);
  return ms;
}

export function loadIndex(botId: string): IndexedStore {
  const p = indexPath(botId);
  if (!fs.existsSync(p)) {
    throw new Error(`Index missing for bot "${botId}". Run: npm run ingest`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as IndexedStore;
}

export function saveIndex(store: IndexedStore): void {
  fs.writeFileSync(indexPath(store.botId), JSON.stringify(store, null, 2));
}

export function createIndex(botId: string, chunks: DocumentChunk[]): IndexedStore {
  const store: IndexedStore = {
    botId,
    updatedAt: new Date().toISOString(),
    chunks,
  };
  saveIndex(store);
  return store;
}

export function searchChunks(
  store: IndexedStore,
  query: string,
  limit = 3
): RetrievalHit[] {
  const ms = buildMiniSearch(store.chunks);
  const chunkById = new Map(store.chunks.map((c) => [c.id, c]));
  const scoreById = new Map<string, number>();

  for (const { text, weight } of expandQueries(query)) {
    const results = ms.search(text);
    for (const r of results) {
      const id = r.id as string;
      const prev = scoreById.get(id) ?? 0;
      scoreById.set(id, prev + r.score * weight);
    }
  }

  const hits: RetrievalHit[] = [];
  for (const [id, miniScore] of scoreById) {
    const chunk = chunkById.get(id);
    if (!chunk) continue;
    hits.push({
      chunk,
      score: combinedScore(miniScore, chunk, query),
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Score threshold plus lexical overlap (with synonyms + expansion) — reduces fuzzy false positives offline. */
export function isLowConfidence(hits: RetrievalHit[], threshold: number, query?: string): boolean {
  if (hits.length === 0) return true;
  const top = hits[0];
  if (top.score < threshold) return true;
  if (!query) return false;

  const haystackLower = `${top.chunk.text} ${top.chunk.title} ${top.chunk.heading ?? ""}`.toLowerCase();
  const docTokens = new Set(tokenize(haystackLower));

  const qTokens = tokenize(query);
  if (qTokens.length === 0) return true;

  const expandedTokens = collectExpandedTokens(query);
  const rawMatches = countMatchingQueryTokens(qTokens, docTokens, haystackLower);
  const expandedMatches = countMatchingQueryTokens(expandedTokens, docTokens, haystackLower);
  const rawRatio = rawMatches / qTokens.length;
  const expandedRatio = expandedTokens.length ? expandedMatches / expandedTokens.length : 0;

  const unmatched = qTokens.filter(
    (t) => !tokenMatchesDocument(t, docTokens, haystackLower)
  );

  const margin =
    hits.length > 1 ? (top.score - hits[1].score) / Math.max(top.score, 1) : 1;
  const intentAligned = chunkAlignsWithQueryIntent(top.chunk, query);

  if (unmatched.length >= 2 && rawMatches < 2) return true;

  if (margin >= 0.4 && intentAligned && rawMatches >= 1 && unmatched.length <= 1) {
    return false;
  }

  if (rawMatches >= 2 && rawRatio >= 0.35) return false;

  if (expandedMatches >= 2 && expandedRatio >= 0.25 && rawMatches >= 1 && unmatched.length <= 1) {
    return false;
  }

  return rawMatches < 2 || rawRatio < 0.35;
}
