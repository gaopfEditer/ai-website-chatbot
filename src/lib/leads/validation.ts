import { z } from "zod";

export const LeadInputSchema = z.object({
  botId: z.string(),
  conversationId: z.string(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  need: z.string().min(3).max(2000),
  reason: z.enum(["unknown_question", "buying_intent"]),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;
