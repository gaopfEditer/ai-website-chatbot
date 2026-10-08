import { buildSystemPrompt, formatContextBlock } from "../prompts/system";
import type { ChatMessage } from "../types";

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL);
}

export async function generateLlmAnswer(params: {
  businessName: string;
  handoffEmail: string;
  userMessage: string;
  history: ChatMessage[];
  passages: { title: string; sourcePath: string; text: string }[];
}): Promise<string> {
  const base = process.env.LLM_BASE_URL!.replace(/\/$/, "");
  const model = process.env.LLM_MODEL!;
  const key = process.env.LLM_API_KEY!;

  const system = buildSystemPrompt(params.businessName, params.handoffEmail);
  const context = formatContextBlock(params.passages);

  const messages = [
    { role: "system", content: system },
    {
      role: "system",
      content: `Documentation context:\n${context}`,
    },
    ...params.history.filter((m) => m.role !== "system").slice(-8),
    { role: "user", content: params.userMessage },
  ];

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM request failed: ${res.status} ${err}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";
}
