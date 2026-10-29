// One-off asset generator for the PDF watermark used by the admin uploader.
// Renders the two existing brand logos (LTR + Arabic) side by side into a single
// high-resolution PNG. Run with: node scripts/make-stamp.mjs
//
// Uses `sharp`, which ships with Next.js (dependency of the image optimiser),
// so no extra dependency is required. The output is committed to
// src/assets/stamp-logo.png and is deliberately NOT placed in public/.

import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const ltr = path.join(root, "public", "logo.svg");
const rtl = path.join(root, "public", "logo-rtl.svg");
const outDir = path.join(root, "src", "assets");
const out = path.join(outDir, "stamp-logo.png");

const SCALE = 4;
const W = 230;
const H = 66;
const GAP = 20;
const totalW = W * 2 + GAP;

mkdirSync(outDir, { recursive: true });

const ltrPng = await sharp(ltr, { density: 96 * SCALE }).resize(W * SCALE, H * SCALE).png().toBuffer();
const rtlPng = await sharp(rtl, { density: 96 * SCALE }).resize(W * SCALE, H * SCALE).png().toBuffer();

await sharp({
  create: {
    width: totalW * SCALE,
    height: H * SCALE,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  },
})
  .composite([
    { input: ltrPng, left: 0, top: 0 },
    { input: rtlPng, left: (W + GAP) * SCALE, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(`wrote ${out} (${totalW * SCALE}x${H * SCALE})`);
