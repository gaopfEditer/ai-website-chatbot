import { loadBotConfig } from "../bot-config";
import { buildOfflineAnswer, detectBuyingIntent } from "./offline-answer";
import { generateLlmAnswer, llmConfigured } from "./llm-client";
import { isLowConfidence, loadIndex, searchChunks } from "../retrieval/search";
import type { ChatMessage } from "../types";

export interface ChatResponsePayload {
  reply: string;
  kind: "answer" | "unknown" | "lead_prompt";
  citations: { title: string; sourcePath: string }[];
  suggestLeadCapture: boolean;
  leadReason?: "unknown_question" | "buying_intent";
}

export async function handleUserMessage(params: {
  botId: string;
  message: string;
  history: ChatMessage[];
}): Promise<ChatResponsePayload> {
  const config = loadBotConfig(params.botId);
  const store = loadIndex(params.botId);
  const hits = searchChunks(store, params.message, 3);
  const low = isLowConfidence(hits, config.unknownConfidenceThreshold, params.message);
  const buying = detectBuyingIntent(params.message);

  if (buying && !low) {
    return {
      reply:
        "I can help with that. Share your name, email, and what you'd like to book or discuss — our team will follow up shortly.",
      kind: "lead_prompt",
      citations: [],
      suggestLeadCapture: true,
      leadReason: "buying_intent",
    };
  }

  if (low) {
    const offline = buildOfflineAnswer(hits, true);
    return {
      reply: offline.message,
      kind: "unknown",
      citations: offline.citations,
      suggestLeadCapture: true,
      leadReason: "unknown_question",
    };
  }

  const passages = hits.map((h) => ({
    title: h.chunk.title,
    sourcePath: h.chunk.sourcePath,
    text: h.chunk.text,
  }));

  if (llmConfigured()) {
    try {
      const reply = await generateLlmAnswer({
        businessName: config.businessName,
        handoffEmail: config.handoffEmail,
        userMessage: params.message,
        history: params.history,
        passages,
      });
      return {
        reply,
        kind: "answer",
        citations: passages.map((p) => ({ title: p.title, sourcePath: p.sourcePath })),
        suggestLeadCapture: false,
      };
    } catch (e) {
      console.error("LLM fallback to offline:", e);
    }
  }

  const offline = buildOfflineAnswer(hits, false);
  return {
    reply: offline.message,
    kind: offline.kind,
    citations: offline.citations,
    suggestLeadCapture: offline.kind === "unknown",
    leadReason: offline.kind === "unknown" ? "unknown_question" : undefined,
  };
}
