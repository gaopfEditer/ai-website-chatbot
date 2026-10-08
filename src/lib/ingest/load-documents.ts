import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { extractPdfText } from "./pdf-text";
import type { DocumentChunk } from "../types";
import { v4 as uuidv4 } from "uuid";

const SUPPORTED = new Set([".md", ".txt", ".html", ".htm", ".pdf"]);

function chunkText(text: string, sourceId: string, title: string, sourcePath: string): DocumentChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  const paragraphs = normalized.split(/(?<=[.!?])\s+|\n{2,}/).filter((p) => p.trim().length > 40);
  const chunks: DocumentChunk[] = [];
  let buffer = "";

  for (const para of paragraphs.length ? paragraphs : [normalized]) {
    if ((buffer + " " + para).length > 600 && buffer.length > 0) {
      chunks.push({
        id: uuidv4(),
        sourceId,
        title,
        sourcePath,
        text: buffer.trim(),
      });
      buffer = para;
    } else {
      buffer = buffer ? `${buffer} ${para}` : para;
    }
  }
  if (buffer.trim()) {
    chunks.push({
      id: uuidv4(),
      sourceId,
      title,
      sourcePath,
      text: buffer.trim(),
    });
  }
  return chunks;
}

async function loadFile(filePath: string, relativePath: string): Promise<DocumentChunk[]> {
  const ext = path.extname(filePath).toLowerCase();
  const title = path.basename(filePath, ext);
  const sourceId = relativePath;

  if (ext === ".pdf") {
    try {
      const text = await extractPdfText(fs.readFileSync(filePath));
      return chunkText(text, sourceId, title, relativePath);
    } catch (err) {
      console.warn(`Could not parse PDF ${relativePath}:`, err);
      return [];
    }
  }
  if (ext === ".html" || ext === ".htm") {
    const html = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(html);
    $("script, style").remove();
    const text = $("body").text() || $.root().text();
    return chunkText(text, sourceId, title, relativePath);
  }
  let text = fs.readFileSync(filePath, "utf8");
  if (ext === ".md") {
    text = text.replace(/^---[\s\S]*?---\n/m, "");
    const sections = text.split(/(?=^##\s)/m).filter(Boolean);
    if (sections.length > 1) {
      const all: DocumentChunk[] = [];
      for (const section of sections) {
        all.push(...chunkText(section, sourceId, title, relativePath));
      }
      return all;
    }
  }
  return chunkText(text, sourceId, title, relativePath);
}

function walkDir(dir: string, base: string, acc: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) walkDir(full, rel, acc);
    else if (SUPPORTED.has(path.extname(entry.name).toLowerCase())) acc.push(full);
  }
}

export async function loadDocumentsFromDir(docsDir: string): Promise<DocumentChunk[]> {
  const absolute = path.isAbsolute(docsDir) ? docsDir : path.join(process.cwd(), docsDir);
  const files: string[] = [];
  walkDir(absolute, "", files);
  const all: DocumentChunk[] = [];
  for (const file of files.sort()) {
    const rel = path.relative(absolute, file);
    if (rel.includes("README-SAMPLE-DATA")) continue;
    const chunks = await loadFile(file, rel);
    all.push(...chunks);
  }
  return all;
}
