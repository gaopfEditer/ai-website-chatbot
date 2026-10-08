import fs from "fs";
import MiniSearch from "minisearch";
import type { DocumentChunk, IndexedStore, RetrievalHit } from "../types";
import { indexPath } from "../paths";
import { expandQueries, tokenize } from "./query-processing";
import { combinedScore } from "./rerank";
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

/** Score threshold plus lexical overlap — reduces fuzzy false positives offline. */
export function isLowConfidence(hits: RetrievalHit[], threshold: number, query?: string): boolean {
  if (hits.length === 0) return true;
  if (hits[0].score < threshold) return true;
  if (!query) return false;

  const qTokens = tokenize(query);
  if (qTokens.length === 0) return true;
  const docTokens = new Set(
    tokenize(
      `${hits[0].chunk.text} ${hits[0].chunk.title} ${hits[0].chunk.heading ?? ""}`
    )
  );
  let overlap = 0;
  for (const t of qTokens) {
    if (docTokens.has(t)) overlap += 1;
  }
  const ratio = overlap / qTokens.length;
  return overlap < 2 || ratio < 0.35;
}
