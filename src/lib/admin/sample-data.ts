import type { ConversationRecord, LeadRecord } from "../types";

/** Fictional sample rows — never mix with live lead capture on public demo deploys. */
export function getSampleLeads(botId: string): LeadRecord[] {
  const base = "2026-10-01T15:00:00.000Z";
  return [
    {
      id: "sample-lead-1",
      botId,
      conversationId: "sample-conv-1",
      name: "Alex Rivera (sample)",
      email: "alex.sample@example.com",
      need: "Teeth whitening consultation",
      reason: "buying_intent",
      createdAt: base,
    },
    {
      id: "sample-lead-2",
      botId,
      conversationId: "sample-conv-2",
      name: "Sam Chen (sample)",
      email: "sam.sample@example.com",
      need: "Insurance coverage question — could not find answer",
      reason: "unknown_question",
      createdAt: "2026-10-02T11:30:00.000Z",
    },
  ];
}

export function getSampleConversations(botId: string): ConversationRecord[] {
  return [
    {
      id: "sample-conv-1",
      botId,
      createdAt: "2026-10-01T14:55:00.000Z",
      updatedAt: "2026-10-01T15:00:00.000Z",
      leadCaptured: true,
      messages: [
        { role: "user", content: "Do you offer whitening for new patients?" },
        {
          role: "assistant",
          content:
            "I can help with that. Share your name, email, and what you'd like to book — our team will follow up shortly.",
        },
      ],
    },
    {
      id: "sample-conv-2",
      botId,
      createdAt: "2026-10-02T11:20:00.000Z",
      updatedAt: "2026-10-02T11:30:00.000Z",
      leadCaptured: true,
      messages: [
        { role: "user", content: "Is root canal covered by Delta Dental PPO?" },
        {
          role: "assistant",
          content:
            "I'm not confident I have that in our documents. Leave your contact info and we'll get back to you.",
        },
      ],
    },
  ];
}
