import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import stampUrl from "@/assets/stamp-logo.png";

/**
 * Applies the TIGIP watermark to a catalog PDF, in the browser, before a single
 * byte is uploaded. Doing it here means the untouched supplier original never
 * leaves the operator's machine and never reaches storage.
 *
 * Per AGENTS.md §5 the public file gets:
 *   - the bilingual logo at 45°, 55% opacity, centred on every page
 *   - a light noise layer to discourage clean text extraction
 *   - invisible protection text
 * and the supplier's own metadata (author, title, producer) is stripped.
 */

export type StampProgress = (done: number, total: number) => void;

let cachedStamp: ArrayBuffer | null = null;

async function loadStamp(): Promise<ArrayBuffer> {
  if (cachedStamp) return cachedStamp;
  const response = await fetch(stampUrl.src);
  if (!response.ok) throw new Error("Could not load the watermark image.");
  cachedStamp = await response.arrayBuffer();
  return cachedStamp;
}

export async function stampCatalogPdf(
  file: File,
  onProgress?: StampProgress,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    throw new Error(
      "That PDF could not be opened. It may be corrupted or password-protected — remove the protection and try again.",
    );
  }

  const image = await pdf.embedPng(await loadStamp());
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  pages.forEach((page, pageIndex) => {
    const { width, height } = page.getSize();

    const stampWidth = Math.min(width * 0.52, 420);
    const stampHeight = (image.height / image.width) * stampWidth;
    const theta = Math.PI / 4;
    const cx = width / 2;
    const cy = height / 2;

    // drawImage rotates around the image's own origin, so place the origin such
    // that the rotated image's centre lands exactly on the page centre.
    const x = cx - (stampWidth / 2) * Math.cos(theta) + (stampHeight / 2) * Math.sin(theta);
    const y = cy - (stampWidth / 2) * Math.sin(theta) - (stampHeight / 2) * Math.cos(theta);

    page.drawImage(image, {
      x,
      y,
      width: stampWidth,
      height: stampHeight,
      rotate: degrees(45),
      opacity: 0.55,
    });

    // Noise layer: faint specks that make OCR / copy-paste reconstruction messy
    // without hurting legibility at normal zoom.
    const specks = 45;
    for (let i = 0; i < specks; i += 1) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const len = 2 + Math.random() * 10;
      page.drawLine({
        start: { x: px, y: py },
        end: { x: px + len, y: py + len * 0.35 },
        thickness: 0.45,
        color: rgb(0.05, 0.34, 0.14),
        opacity: 0.05,
      });
    }

    // Present in the content stream, invisible on screen.
    page.drawText("Protected catalogue - Turkish Iraqi Gate (tigip.com). Automated removal is forbidden.", {
      x: width * 0.08,
      y: height * 0.045,
      size: 3.5,
      font,
      color: rgb(0.05, 0.34, 0.14),
      opacity: 0,
    });

    onProgress?.(pageIndex + 1, pages.length);
  });

  // Strip supplier identity that lives in the document properties.
  pdf.setTitle("TIGIP Catalogue");
  pdf.setAuthor("Turkish Iraqi Gate");
  pdf.setSubject("Product catalogue");
  pdf.setKeywords([]);
  pdf.setCreator("Turkish Iraqi Gate");
  pdf.setProducer("TIGIP");

  return pdf.save();
}
