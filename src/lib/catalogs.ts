import fs from "node:fs";
import path from "node:path";
import { list } from "@vercel/blob";
import {
  CATEGORY_ORDER,
  type CatalogEntry,
  type CatalogsByCategory,
  type CategoryKey,
} from "@/lib/catalog-types";

export {
  CATEGORY_ORDER,
  isCategoryKey,
  ADMIN_CATEGORY_LABELS,
} from "@/lib/catalog-types";
export type { CatalogEntry, CatalogsByCategory, CategoryKey } from "@/lib/catalog-types";

export const BLOB_PREFIX = "catalogs/";

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** PDFs committed to the repo under public/catalogs/<category>/. */
function listRepoPdfs(category: CategoryKey): string[] {
  const dir = path.join(process.cwd(), "public", "catalogs", category);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .sort();
}

type BlobRecord = { pathname: string; url: string; uploadedAt: Date | string; size: number };

async function listBlobPdfs(): Promise<BlobRecord[]> {
  if (!blobConfigured()) return [];
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    return blobs
      .filter((blob) => blob.pathname.toLowerCase().endsWith(".pdf"))
      .map((blob) => ({
        pathname: blob.pathname,
        url: blob.url,
        uploadedAt: blob.uploadedAt,
        size: blob.size,
      }));
  } catch (error) {
    console.error("catalog blob listing failed", error);
    return [];
  }
}

/**
 * Every catalog PDF, grouped by category and numbered.
 * Repo files come first (they keep their existing numbering), uploaded files
 * follow in upload order, so adding a PDF never renumbers what is already
 * published.
 */
export async function listCatalogsByCategory(): Promise<CatalogsByCategory> {
  const blobs = await listBlobPdfs();
  const byCategory = {} as CatalogsByCategory;

  for (const category of CATEGORY_ORDER) {
    const entries: CatalogEntry[] = [];

    for (const file of listRepoPdfs(category)) {
      entries.push({
        id: `repo:${category}/${file}`,
        category,
        index: entries.length + 1,
        href: `/${BLOB_PREFIX}${category}/${encodeURIComponent(file)}`,
        source: "repo",
      });
    }

    const uploaded = blobs
      .filter((blob) => blob.pathname.startsWith(`${BLOB_PREFIX}${category}/`))
      .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    for (const blob of uploaded) {
      entries.push({
        id: `blob:${blob.url}`,
        category,
        index: entries.length + 1,
        href: blob.url,
        source: "blob",
        uploadedAt: new Date(blob.uploadedAt).toISOString(),
        size: blob.size,
      });
    }

    byCategory[category] = entries;
  }

  return byCategory;
}

export async function listAllCatalogs(): Promise<CatalogEntry[]> {
  const grouped = await listCatalogsByCategory();
  return CATEGORY_ORDER.flatMap((category) => grouped[category]);
}
