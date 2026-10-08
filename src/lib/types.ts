export interface DocumentChunk {
  id: string;
  sourceId: string;
  title: string;
  /** Section heading when the chunk is one logical doc section (e.g. markdown ##). */
  heading?: string;
  sourcePath: string;
  text: string;
}

export interface IndexedStore {
  botId: string;
  updatedAt: string;
  chunks: DocumentChunk[];
}

export interface RetrievalHit {
  chunk: DocumentChunk;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type LeadCaptureReason = "unknown_question" | "buying_intent";

export interface LeadRecord {
  id: string;
  botId: string;
  conversationId: string;
  name: string;
  email: string;
  need: string;
  reason: LeadCaptureReason;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  botId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  leadCaptured: boolean;
}
