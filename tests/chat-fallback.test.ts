import { describe, expect, it, beforeAll } from "vitest";
import path from "path";
import { loadDocumentsFromDir } from "@/lib/ingest/load-documents";
import { createIndex } from "@/lib/retrieval/search";
import { handleUserMessage } from "@/lib/chat/handle-message";

const BOT_ID = "bright-smile-demo";

beforeAll(async () => {
  const docs = path.join(process.cwd(), "data/sample-business/bright-smile-dental");
  const chunks = await loadDocumentsFromDir(docs);
  createIndex(BOT_ID, chunks);
});

describe("chat fallback path", () => {
  it("offers lead capture for unknown questions", async () => {
    const res = await handleUserMessage({
      botId: BOT_ID,
      message: "Do you sell yacht insurance for quantum computers?",
      history: [],
    });
    expect(res.kind).toBe("unknown");
    expect(res.suggestLeadCapture).toBe(true);
    expect(res.reply.toLowerCase()).toMatch(/couldn't find|don't want to guess/);
  });

  it("answers known FAQ with sources offline", async () => {
    const res = await handleUserMessage({
      botId: BOT_ID,
      message: "How much is professional whitening?",
      history: [],
    });
    expect(res.kind).toBe("answer");
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.reply.toLowerCase()).toMatch(/450|whitening/);
  });
});
