import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { loadBotConfig } from "@/lib/bot-config";
import { loadDocumentsFromDir } from "@/lib/ingest/load-documents";
import { createIndex } from "@/lib/retrieval/search";

export async function POST(req: NextRequest) {
  const botId = (await req.json().catch(() => ({}))).botId ?? "bright-smile-demo";
  const config = loadBotConfig(botId);
  const docsDir = path.isAbsolute(config.docsPath)
    ? config.docsPath
    : path.join(process.cwd(), config.docsPath);
  const chunks = await loadDocumentsFromDir(docsDir);
  const store = createIndex(botId, chunks);
  return NextResponse.json({ ok: true, chunkCount: chunks.length, updatedAt: store.updatedAt });
}
