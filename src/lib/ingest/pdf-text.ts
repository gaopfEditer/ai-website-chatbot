/** Extract plain text from PDF bytes (offline, no API keys). */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const doc = await loadingTask.promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ");
    parts.push(pageText);
  }
  return parts.join("\n").trim();
}
