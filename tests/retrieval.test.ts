import { describe, expect, it, beforeAll } from "vitest";
import path from "path";
import { loadDocumentsFromDir } from "@/lib/ingest/load-documents";
import { createIndex, searchChunks, isLowConfidence, loadIndex } from "@/lib/retrieval/search";
import { buildOfflineAnswer } from "@/lib/chat/offline-answer";
import { handleUserMessage } from "@/lib/chat/handle-message";

const BOT_ID = "bright-smile-demo";

beforeAll(async () => {
  const docs = path.join(process.cwd(), "data/sample-business/bright-smile-dental");
  const chunks = await loadDocumentsFromDir(docs);
  createIndex(BOT_ID, chunks);
});

function topHit(query: string) {
  const store = loadIndex(BOT_ID);
  const hits = searchChunks(store, query, 3);
  expect(hits.length).toBeGreaterThan(0);
  return hits[0];
}

describe("retrieval regression (demo docs)", () => {
  it("opening hours → office hours table, not holidays", () => {
    const hit = topHit("What are your opening hours?");
    expect(hit.chunk.sourcePath).toBe("hours-and-location.md");
    expect(hit.chunk.heading?.toLowerCase()).toMatch(/office hours/);
    expect(hit.chunk.text.toLowerCase()).toContain("monday");
    expect(hit.chunk.text.toLowerCase()).not.toContain("thanksgiving");
  });

  it("Saturday hours → office hours row for Saturday", () => {
    const hit = topHit("When are you open on Saturday?");
    expect(hit.chunk.sourcePath).toBe("hours-and-location.md");
    expect(hit.chunk.text.toLowerCase()).toContain("saturday");
    expect(hit.chunk.sourcePath).not.toMatch(/insurance/);
  });

  it("Saturday office hours phrasing", () => {
    const hit = topHit("What are your Saturday office hours?");
    expect(hit.chunk.sourcePath).toMatch(/hours/i);
    expect(hit.chunk.text.toLowerCase()).toContain("saturday");
  });

  it("location and address", () => {
    const hit = topHit("What is your address?");
    expect(hit.chunk.sourcePath).toBe("hours-and-location.md");
    expect(hit.chunk.text.toLowerCase()).toMatch(/oakview|412/);
  });

  it("parking", () => {
    const hit = topHit("Is there parking at the clinic?");
    expect(hit.chunk.sourcePath).toBe("hours-and-location.md");
    expect(hit.chunk.heading?.toLowerCase()).toMatch(/parking/);
  });

  it("cleaning price", () => {
    const hit = topHit("How much is a routine cleaning?");
    expect(hit.chunk.sourcePath).toBe("services.md");
    expect(hit.chunk.text).toMatch(/\$89|\$129/);
  });

  it("whitening price", () => {
    const hit = topHit("How much is professional whitening?");
    expect(hit.chunk.sourcePath).toBe("services.md");
    expect(hit.chunk.text).toMatch(/\$450/);
  });

  it("insurance accepted", () => {
    const hit = topHit("Do you accept insurance?");
    expect(hit.chunk.sourcePath).toBe("insurance-faq.md");
    expect(hit.chunk.text.toLowerCase()).toMatch(/in-network|maple health/);
  });

  it("booking an appointment", () => {
    const hit = topHit("How do I book an appointment?");
    expect(hit.chunk.sourcePath).toBe("faq.html");
    expect(hit.chunk.heading?.toLowerCase()).toMatch(/book/);
  });

  it("dental emergency", () => {
    const hit = topHit("I have a toothache — do you have same-day emergency visits?");
    expect(hit.chunk.sourcePath).toBe("services.md");
    expect(hit.chunk.heading?.toLowerCase()).toMatch(/emergency/);
  });

  it("children patients", () => {
    const hit = topHit("Do you see children?");
    expect(hit.chunk.sourcePath).toBe("faq.html");
    expect(hit.chunk.text.toLowerCase()).toMatch(/age 3|children/);
  });

  it("payment plans / financing", () => {
    const hit = topHit("Do you offer payment plans without insurance?");
    expect(hit.chunk.sourcePath).toBe("insurance-faq.md");
    expect(hit.chunk.text.toLowerCase()).toMatch(/careplan|financing/);
  });

  it("cancellation policy", () => {
    const hit = topHit("What is your cancellation policy?");
    expect(hit.chunk.sourcePath).toBe("insurance-faq.md");
    expect(hit.chunk.heading?.toLowerCase()).toMatch(/cancellation/);
    expect(hit.chunk.text).toMatch(/24 hours|\$50/);
  });

  it("unknown question → low confidence and lead fallback", async () => {
    const store = loadIndex(BOT_ID);
    const hits = searchChunks(store, "quantum blockchain yacht insurance", 3);
    expect(isLowConfidence(hits, 4, "quantum blockchain yacht insurance")).toBe(true);
    const answer = buildOfflineAnswer(hits, true, "quantum blockchain yacht insurance");
    expect(answer.kind).toBe("unknown");
    expect(answer.message.toLowerCase()).toContain("couldn't find");

    const res = await handleUserMessage({
      botId: BOT_ID,
      message: "Do you sell yacht insurance for quantum computers?",
      history: [],
    });
    expect(res.kind).toBe("unknown");
    expect(res.suggestLeadCapture).toBe(true);
  });
});

describe("offline answer formatting", () => {
  it("quotes a concise excerpt with a single source citation", () => {
    const store = loadIndex(BOT_ID);
    const hits = searchChunks(store, "When are you open on Saturday?", 1);
    const answer = buildOfflineAnswer(hits, false, "When are you open on Saturday?");
    expect(answer.kind).toBe("answer");
    expect(answer.citations).toHaveLength(1);
    expect(answer.message).toMatch(/Source:/);
    expect(answer.message.toLowerCase()).toContain("saturday");
  });
});
