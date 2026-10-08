import fs from "fs";
import MiniSearch from "minisearch";
import type { DocumentChunk, IndexedStore, RetrievalHit } from "../types";
import { indexPath } from "../paths";

function buildMiniSearch(chunks: DocumentChunk[]): MiniSearch<DocumentChunk> {
  const ms = new MiniSearch({
    fields: ["text", "title", "sourcePath"],
    storeFields: ["id", "sourceId", "title", "sourcePath", "text"],
    searchOptions: {
      boost: { title: 2, sourcePath: 1.5 },
      fuzzy: 0.15,
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
  const results = ms.search(query).slice(0, limit);
  return results.map((r) => ({
    chunk: r as unknown as DocumentChunk,
    score: r.score,
  }));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/** Score threshold plus lexical overlap — reduces fuzzy false positives offline. */
export function isLowConfidence(hits: RetrievalHit[], threshold: number, query?: string): boolean {
  if (hits.length === 0) return true;
  if (hits[0].score < threshold) return true;
  if (!query) return false;

  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return true;
  const docTokens = new Set(tokenize(hits[0].chunk.text + " " + hits[0].chunk.title));
  let overlap = 0;
  for (const t of qTokens) {
    if (docTokens.has(t)) overlap += 1;
  }
  const ratio = overlap / qTokens.size;
  return overlap < 2 || ratio < 0.35;
}
