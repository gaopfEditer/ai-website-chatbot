import fs from "fs";
import path from "path";
import { loadBotConfig } from "../src/lib/bot-config";
import { loadDocumentsFromDir } from "../src/lib/ingest/load-documents";
import { createIndex } from "../src/lib/retrieval/search";
import { dataPath } from "../src/lib/paths";
import { ensureSamplePdf } from "./ensure-sample-pdf";

async function main() {
  await ensureSamplePdf();
  const botId = process.env.BOT_ID ?? "bright-smile-demo";
  const config = loadBotConfig(botId);
  const docsDir = path.isAbsolute(config.docsPath)
    ? config.docsPath
    : path.join(process.cwd(), config.docsPath);

  fs.mkdirSync(dataPath("index"), { recursive: true });
  const chunks = await loadDocumentsFromDir(docsDir);
  const store = createIndex(botId, chunks);
  console.log(`Indexed ${chunks.length} chunks for bot "${botId}" at ${store.updatedAt}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
