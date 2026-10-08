import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { loadBotConfig } from "@/lib/bot-config";
import { loadDocumentsFromDir } from "@/lib/ingest/load-documents";
import { createIndex } from "@/lib/retrieval/search";
import { requireAdminWrite } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  const denied = requireAdminWrite(req.headers.get("authorization"));
  if (denied) return denied;

  const botId = (await req.json().catch(() => ({}))).botId ?? "bright-smile-demo";
  const config = loadBotConfig(botId);
  const docsDir = path.isAbsolute(config.docsPath)
    ? config.docsPath
    : path.join(process.cwd(), config.docsPath);
  const chunks = await loadDocumentsFromDir(docsDir);

  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error:
          "Re-index at runtime is disabled on Vercel (read-only filesystem). Run ingest at build time or re-deploy.",
      },
      { status: 503 }
    );
  }

  try {
    const store = createIndex(botId, chunks);
    return NextResponse.json({ ok: true, chunkCount: chunks.length, updatedAt: store.updatedAt });
  } catch (e) {
    console.error("Reindex failed:", e);
    return NextResponse.json({ error: "Failed to write index" }, { status: 500 });
  }
}
