import { describe, expect, it, beforeAll } from "vitest";
import path from "path";
import { loadDocumentsFromDir } from "@/lib/ingest/load-documents";
import { createIndex } from "@/lib/retrieval/search";
import { handleUserMessage } from "@/lib/chat/handle-message";
import { excerptLooksLikeHeadingOnly } from "@/lib/chat/offline-answer";

const BOT_ID = "bright-smile-demo";

beforeAll(async () => {
  const docs = path.join(process.cwd(), "data/sample-business/bright-smile-dental");
  const chunks = await loadDocumentsFromDir(docs);
  createIndex(BOT_ID, chunks);
});

type RealisticCase = {
  question: string;
  sourcePath: string;
  answerPattern: RegExp;
  allowLeadPrompt?: boolean;
};

const REALISTIC: RealisticCase[] = [
  {
    question: "What are your opening hours?",
    sourcePath: "hours-and-location.md",
    answerPattern: /monday|8:00|office hours/i,
  },
  {
    question: "When are you open on Saturday?",
    sourcePath: "hours-and-location.md",
    answerPattern: /saturday|9:00/i,
  },
  {
    question: "What is your address?",
    sourcePath: "hours-and-location.md",
    answerPattern: /oakview|412/i,
  },
  {
    question: "Is there parking at the clinic?",
    sourcePath: "hours-and-location.md",
    answerPattern: /parking|garage|birch/i,
  },
  {
    question: "How much is a routine cleaning?",
    sourcePath: "services.md",
    answerPattern: /\$89|\$129|cleaning/i,
  },
  {
    question: "How much is professional whitening?",
    sourcePath: "services.md",
    answerPattern: /\$450|whitening/i,
  },
  {
    question: "Do you accept insurance?",
    sourcePath: "insurance-faq.md",
    answerPattern: /in-network|maple health|member id/i,
  },
  {
    question: "How do I book an appointment?",
    sourcePath: "faq.html",
    answerPattern: /book|appointment|call|online/i,
    allowLeadPrompt: true,
  },
  {
    question: "I have a toothache — do you have same-day emergency visits?",
    sourcePath: "services.md",
    answerPattern: /emergency|same-day|tooth/i,
  },
  {
    question: "Do you see children?",
    sourcePath: "faq.html",
    answerPattern: /child|age 3|kids/i,
  },
  {
    question: "Do you offer payment plans without insurance?",
    sourcePath: "insurance-faq.md",
    answerPattern: /careplan|financing|credit card/i,
  },
  {
    question: "What is your cancellation policy?",
    sourcePath: "insurance-faq.md",
    answerPattern: /24 hours|\$50|cancel/i,
  },
  {
    question: "What are your Saturday office hours?",
    sourcePath: "hours-and-location.md",
    answerPattern: /saturday|9:00/i,
  },
  {
    question: "Can I pay with a credit card if I'm uninsured?",
    sourcePath: "insurance-faq.md",
    answerPattern: /credit card|careplan|cash/i,
  },
];

const NONSENSE = [
  "Do you sell yacht insurance for quantum computers?",
  "quantum blockchain yacht insurance",
  "Where can I buy rocket fuel for my submarine?",
];

describe("chat E2E (handleUserMessage)", () => {
  it.each(REALISTIC.map((c) => [c.question, c] as const))(
    "answers %s from docs",
    async (_label, tc) => {
      const res = await handleUserMessage({
        botId: BOT_ID,
        message: tc.question,
        history: [],
      });

      expect(res.reply.toLowerCase()).not.toMatch(/couldn't find/);

      if (tc.allowLeadPrompt) {
        expect(["answer", "lead_prompt"]).toContain(res.kind);
      } else {
        expect(res.kind).toBe("answer");
      }

      if (res.kind === "answer") {
        expect(res.citations.length).toBeGreaterThan(0);
        expect(res.citations[0].sourcePath).toBe(tc.sourcePath);
        expect(res.reply).toMatch(tc.answerPattern);
        expect(excerptLooksLikeHeadingOnly(res.reply)).toBe(false);
      }
    }
  );

  it.each(NONSENSE.map((q) => [q] as const))("falls back for nonsense: %s", async (question) => {
    const res = await handleUserMessage({
      botId: BOT_ID,
      message: question,
      history: [],
    });
    expect(res.kind).toBe("unknown");
    expect(res.suggestLeadCapture).toBe(true);
    expect(res.reply.toLowerCase()).toMatch(/couldn't find|don't want to guess/);
  });
});
