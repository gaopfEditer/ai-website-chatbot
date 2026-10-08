import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function ensureSamplePdf(): Promise<void> {
  const filePath = path.join(
    process.cwd(),
    "data/sample-business/bright-smile-dental/new-patient-guide.pdf"
  );
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = [
    "New Patient Guide (Sample Data)",
    "Bring insurance card and arrive 15 minutes early.",
    "First visit includes exam, cleaning, and X-rays when needed.",
  ];
  let y = 720;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font });
    y -= 22;
  }
  const bytes = await doc.save();
  fs.writeFileSync(filePath, bytes);
  if (!bytes.byteLength) {
    throw new Error("Failed to write sample PDF");
  }
}

if (require.main === module) {
  ensureSamplePdf().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
