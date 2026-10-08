import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { extractPdfText } from "./pdf-text";
import type { DocumentChunk } from "../types";
import { v4 as uuidv4 } from "uuid";

const SUPPORTED = new Set([".md", ".txt", ".html", ".htm", ".pdf"]);

function makeChunk(
  sourceId: string,
  title: string,
  sourcePath: string,
  text: string,
  heading?: string
): DocumentChunk {
  return {
    id: uuidv4(),
    sourceId,
    title,
    heading,
    sourcePath,
    text: text.trim(),
  };
}

function hasMarkdownTable(body: string): boolean {
  return /^\|.+\|$/m.test(body) || /\|[\s-]+\|/.test(body);
}

function chunkProse(
  body: string,
  sourceId: string,
  title: string,
  sourcePath: string,
  heading: string | undefined,
  maxLen = 700
): DocumentChunk[] {
  const prefix = heading ? `## ${heading}\n\n` : "";
  const fullText = `${prefix}${body}`.trim();
  if (fullText.length <= maxLen || hasMarkdownTable(body)) {
    return [makeChunk(sourceId, title, sourcePath, fullText, heading)];
  }

  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());
  const chunks: DocumentChunk[] = [];
  let buffer = "";

  for (const para of paragraphs.length ? paragraphs : [body]) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if ((prefix + candidate).length > maxLen && buffer) {
      chunks.push(makeChunk(sourceId, title, sourcePath, `${prefix}${buffer}`.trim(), heading));
      buffer = para;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) {
    chunks.push(makeChunk(sourceId, title, sourcePath, `${prefix}${buffer}`.trim(), heading));
  }
  return chunks;
}

function splitMarkdownSections(text: string): { heading?: string; body: string }[] {
  const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n/m, "");
  const normalized = withoutFrontmatter.replace(/\r\n/g, "\n").trim();
  const parts = normalized.split(/(?=^##\s+)/m).filter(Boolean);
  if (parts.length <= 1 && !/^##\s/m.test(normalized)) {
    return [{ body: normalized }];
  }

  return parts.map((part) => {
    const sectionMatch = part.match(/^##\s+(.+?)(?:\n([\s\S]*))?$/);
    if (sectionMatch) {
      return {
        heading: sectionMatch[1].trim(),
        body: (sectionMatch[2] ?? "").trim(),
      };
    }
    return { body: part.trim() };
  });
}

function chunkMarkdown(text: string, sourceId: string, title: string, sourcePath: string): DocumentChunk[] {
  const sections = splitMarkdownSections(text);
  const all: DocumentChunk[] = [];
  for (const section of sections) {
    if (!section.body && !section.heading) continue;
    const body = section.body || "";
    if (hasMarkdownTable(body)) {
      const tableText = section.heading
        ? `## ${section.heading}\n\n${body}`
        : body;
      all.push(makeChunk(sourceId, title, sourcePath, tableText, section.heading));
    } else {
      all.push(...chunkProse(body, sourceId, title, sourcePath, section.heading));
    }
  }
  return all;
}

function chunkHtml(html: string, sourceId: string, title: string, sourcePath: string): DocumentChunk[] {
  const $ = cheerio.load(html);
  $("script, style").remove();
  const chunks: DocumentChunk[] = [];

  $("h2").each((_, el) => {
    const heading = $(el).text().trim();
    const parts: string[] = [];
    let sib = $(el).next();
    while (sib.length && !sib.is("h2")) {
      const t = sib.text().trim();
      if (t) parts.push(t);
      sib = sib.next();
    }
    const body = parts.join("\n\n");
    if (heading || body) {
      chunks.push(
        makeChunk(
          sourceId,
          title,
          sourcePath,
          body ? `${heading}\n\n${body}` : heading,
          heading || undefined
        )
      );
    }
  });

  if (chunks.length === 0) {
    const text = $("body").text() || $.root().text();
    return chunkProse(text.replace(/\s+/g, " ").trim(), sourceId, title, sourcePath, undefined);
  }
  return chunks;
}

function chunkPlainText(text: string, sourceId: string, title: string, sourcePath: string): DocumentChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return chunkProse(normalized, sourceId, title, sourcePath, undefined);
}

async function loadFile(filePath: string, relativePath: string): Promise<DocumentChunk[]> {
  const ext = path.extname(filePath).toLowerCase();
  const title = path.basename(filePath, ext);
  const sourceId = relativePath;

  if (ext === ".pdf") {
    try {
      const text = await extractPdfText(fs.readFileSync(filePath));
      return chunkPlainText(text, sourceId, title, relativePath);
    } catch (err) {
      console.warn(`Could not parse PDF ${relativePath}:`, err);
      return [];
    }
  }
  if (ext === ".html" || ext === ".htm") {
    const html = fs.readFileSync(filePath, "utf8");
    return chunkHtml(html, sourceId, title, relativePath);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (ext === ".md") {
    return chunkMarkdown(raw, sourceId, title, relativePath);
  }
  return chunkPlainText(raw, sourceId, title, relativePath);
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
