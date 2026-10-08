import fs from "fs";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ConversationRecord, LeadRecord, ChatMessage } from "../types";
import type { LeadInput } from "./validation";
import { dataPath } from "../paths";
import { createGoogleSheetsAdapter } from "./adapters/google-sheets";
import { createHubSpotAdapter } from "./adapters/hubspot";
import { useInMemoryLeadStore } from "./persistence";

const DB_FILE = dataPath("leads.db");
const CSV_FILE = dataPath("leads.csv");

let db: Database.Database | null = null;

const memoryLeads: LeadRecord[] = [];
const memoryConversations = new Map<string, ConversationRecord>();

function usingMemory(): boolean {
  return useInMemoryLeadStore();
}

function getDb(): Database.Database {
  if (usingMemory()) {
    throw new Error("SQLite disabled in ephemeral deployment");
  }
  if (!db) {
    fs.mkdirSync(dataPath(), { recursive: true });
    db = new Database(DB_FILE);
    db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        need TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        messages_json TEXT NOT NULL,
        lead_captured INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return db;
}

function appendCsv(lead: LeadRecord): void {
  if (usingMemory()) return;
  try {
    const header = "id,bot_id,conversation_id,name,email,need,reason,created_at\n";
    const row = [
      lead.id,
      lead.botId,
      lead.conversationId,
      `"${lead.name.replace(/"/g, '""')}"`,
      lead.email,
      `"${lead.need.replace(/"/g, '""')}"`,
      lead.reason,
      lead.createdAt,
    ].join(",");
    if (!fs.existsSync(CSV_FILE)) fs.writeFileSync(CSV_FILE, header);
    fs.appendFileSync(CSV_FILE, row + "\n");
  } catch (e) {
    console.warn("CSV append skipped:", e);
  }
}

const sinks = [createGoogleSheetsAdapter(), createHubSpotAdapter()];

export async function saveLead(input: LeadInput): Promise<LeadRecord> {
  const lead: LeadRecord = {
    id: uuidv4(),
    botId: input.botId,
    conversationId: input.conversationId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    need: input.need.trim(),
    reason: input.reason,
    createdAt: new Date().toISOString(),
  };

  if (usingMemory()) {
    memoryLeads.unshift(lead);
    const conv = memoryConversations.get(lead.conversationId);
    if (conv) {
      conv.leadCaptured = true;
      memoryConversations.set(lead.conversationId, conv);
    }
  } else {
    const database = getDb();
    database
      .prepare(
        `INSERT INTO leads (id, bot_id, conversation_id, name, email, need, reason, created_at)
       VALUES (@id, @botId, @conversationId, @name, @email, @need, @reason, @createdAt)`
      )
      .run({
        id: lead.id,
        botId: lead.botId,
        conversationId: lead.conversationId,
        name: lead.name,
        email: lead.email,
        need: lead.need,
        reason: lead.reason,
        createdAt: lead.createdAt,
      });

    appendCsv(lead);

    database
      .prepare(`UPDATE conversations SET lead_captured = 1 WHERE id = ?`)
      .run(lead.conversationId);
  }

  for (const sink of sinks) {
    if (sink.enabled) {
      try {
        await sink.send(lead);
      } catch (e) {
        console.error(`Lead sink ${sink.name} failed:`, e);
      }
    }
  }

  return lead;
}

export function listLeads(botId?: string): LeadRecord[] {
  if (usingMemory()) {
    const rows = botId ? memoryLeads.filter((l) => l.botId === botId) : memoryLeads;
    return [...rows];
  }
  const database = getDb();
  const rows = botId
    ? database.prepare(`SELECT * FROM leads WHERE bot_id = ? ORDER BY created_at DESC`).all(botId)
    : database.prepare(`SELECT * FROM leads ORDER BY created_at DESC`).all();

  return (rows as Record<string, string>[]).map((r) => ({
    id: r.id,
    botId: r.bot_id,
    conversationId: r.conversation_id,
    name: r.name,
    email: r.email,
    need: r.need,
    reason: r.reason as LeadRecord["reason"],
    createdAt: r.created_at,
  }));
}

export function getOrCreateConversation(id: string, botId: string): ConversationRecord {
  if (usingMemory()) {
    const existing = memoryConversations.get(id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const conv: ConversationRecord = {
      id,
      botId,
      createdAt: now,
      updatedAt: now,
      messages: [],
      leadCaptured: false,
    };
    memoryConversations.set(id, conv);
    return conv;
  }

  const database = getDb();
  const row = database.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id) as
    | Record<string, string | number>
    | undefined;

  if (row) {
    return {
      id: row.id as string,
      botId: row.bot_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      messages: JSON.parse(row.messages_json as string) as ChatMessage[],
      leadCaptured: Boolean(row.lead_captured),
    };
  }

  const now = new Date().toISOString();
  const conv: ConversationRecord = {
    id,
    botId,
    createdAt: now,
    updatedAt: now,
    messages: [],
    leadCaptured: false,
  };
  database
    .prepare(
      `INSERT INTO conversations (id, bot_id, created_at, updated_at, messages_json, lead_captured)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .run(id, botId, now, now, JSON.stringify([]));
  return conv;
}

export function appendMessage(conversationId: string, message: ChatMessage): void {
  if (usingMemory()) {
    const conv = memoryConversations.get(conversationId);
    if (!conv) return;
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();
    memoryConversations.set(conversationId, conv);
    return;
  }

  const database = getDb();
  const row = database.prepare(`SELECT * FROM conversations WHERE id = ?`).get(conversationId) as
    | Record<string, string>
    | undefined;
  if (!row) return;
  const messages = JSON.parse(row.messages_json) as ChatMessage[];
  messages.push(message);
  const now = new Date().toISOString();
  database
    .prepare(`UPDATE conversations SET messages_json = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(messages), now, conversationId);
}

export function listConversations(botId?: string): ConversationRecord[] {
  if (usingMemory()) {
    const rows = [...memoryConversations.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    return (botId ? rows.filter((c) => c.botId === botId) : rows).slice(0, 100);
  }

  const database = getDb();
  const rows = botId
    ? database
        .prepare(`SELECT * FROM conversations WHERE bot_id = ? ORDER BY updated_at DESC LIMIT 100`)
        .all(botId)
    : database
        .prepare(`SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 100`)
        .all();

  return (rows as Record<string, string | number>[]).map((r) => ({
    id: r.id as string,
    botId: r.bot_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    messages: JSON.parse(r.messages_json as string) as ChatMessage[],
    leadCaptured: Boolean(r.lead_captured),
  }));
}

/** Test helper */
export function resetStoreForTests(): void {
  memoryLeads.length = 0;
  memoryConversations.clear();
  if (db) {
    db.close();
    db = null;
  }
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  if (fs.existsSync(CSV_FILE)) fs.unlinkSync(CSV_FILE);
}
