import fs from "node:fs";
import path from "node:path";
import { list } from "@vercel/blob";
import {
  getCategoryKeys,
  getHiddenCatalogIds,
  repoCatalogId,
} from "@/lib/catalog-settings";
import {
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

async function loadHiddenCatalogIds(): Promise<Set<string>> {
  try {
    return await getHiddenCatalogIds();
  } catch (error) {
    // A database outage must not hide the public PDFs; treat nothing as hidden.
    console.error("hidden catalog files unavailable", error);
    return new Set();
  }
}

/**
 * Every catalog PDF, grouped by category and numbered.
 * Repo files come first (they keep their existing numbering), uploaded files
 * follow in upload order, so adding — or hiding — a PDF never renumbers what
 * is already published. The admin panel passes `includeHidden` so it can offer
 * a Restore action; the public page uses the default filtered list.
 */
export async function listCatalogsByCategory(
  options: { includeHidden?: boolean } = {},
): Promise<CatalogsByCategory> {
  const blobs = await listBlobPdfs();
  // Even the admin view needs this set: it keeps hidden entries so they can be
  // restored, but labels them as hidden. The public view skips them below.
  const hiddenIds = await loadHiddenCatalogIds();
  const byCategory = {} as CatalogsByCategory;
  let keys: string[];
  try {
    keys = await getCategoryKeys();
  } catch (error) {
    // A database outage must not resurrect categories the admin deleted; show
    // an empty grid until settings are readable again.
    console.error("catalog categories unavailable", error);
    keys = [];
  }

  for (const category of keys) {
    const entries: CatalogEntry[] = [];
    const repoFiles = listRepoPdfs(category);

    // Numbering follows the full repo list even when entries are hidden, so
    // "Medical Equipment 3" never becomes "Medical Equipment 2".
    let nextIndex = 0;
    for (const file of repoFiles) {
      nextIndex += 1;
      const id = repoCatalogId(category, file);
      const hidden = hiddenIds.has(id);
      if (hidden && !options.includeHidden) continue;
      entries.push({
        id,
        category,
        index: nextIndex,
        href: `/${BLOB_PREFIX}${category}/${encodeURIComponent(file)}`,
        source: "repo",
        ...(hidden ? { hidden: true } : {}),
      });
    }

    const uploaded = blobs
      .filter((blob) => blob.pathname.startsWith(`${BLOB_PREFIX}${category}/`))
      .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    for (const blob of uploaded) {
      nextIndex += 1;
      entries.push({
        id: `blob:${blob.url}`,
        category,
        index: nextIndex,
        href: blob.url,
        source: "blob",
        uploadedAt: new Date(blob.uploadedAt).toISOString(),
        size: blob.size,
      });
    }

    byCategory[category as CategoryKey] = entries;
  }

  return byCategory;
}

export async function listAllCatalogs(): Promise<CatalogEntry[]> {
  const grouped = await listCatalogsByCategory();
  return Object.keys(grouped).flatMap((category) => grouped[category as CategoryKey]);
}
