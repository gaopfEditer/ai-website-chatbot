import { describe, expect, it, beforeAll } from "vitest";
import path from "path";
import { loadDocumentsFromDir } from "@/lib/ingest/load-documents";
import { createIndex, searchChunks, isLowConfidence } from "@/lib/retrieval/search";
import { buildOfflineAnswer } from "@/lib/chat/offline-answer";

const BOT_ID = "test-retrieval-bot";

beforeAll(async () => {
  const docs = path.join(process.cwd(), "data/sample-business/bright-smile-dental");
  const chunks = await loadDocumentsFromDir(docs);
  createIndex(BOT_ID, chunks);
});

describe("retrieval", () => {
  it("finds office hours content with citation path", async () => {
    const { loadIndex } = await import("@/lib/retrieval/search");
    const store = loadIndex(BOT_ID);
    const hits = searchChunks(store, "What are your Saturday office hours?", 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.sourcePath).toMatch(/hours/i);
    expect(hits[0].chunk.text.toLowerCase()).toContain("saturday");
  });

  it("treats unrelated questions as low confidence", async () => {
    const { loadIndex } = await import("@/lib/retrieval/search");
    const store = loadIndex(BOT_ID);
    const hits = searchChunks(store, "quantum blockchain yacht insurance", 3);
    expect(isLowConfidence(hits, 4, "quantum blockchain yacht insurance")).toBe(true);
    const answer = buildOfflineAnswer(hits, true);
    expect(answer.kind).toBe("unknown");
    expect(answer.message.toLowerCase()).toContain("couldn't find");
  });
});
