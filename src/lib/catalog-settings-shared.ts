/**
 * Client-safe pieces of the catalog settings model.
 *
 * `catalog-settings.ts` owns the database calls and is `server-only`; admin
 * components may import these constants/types and the pure helpers below
 * without pulling a database client into the browser bundle.
 */

import type { Language } from "@/lib/translations";

export const MAX_CATEGORIES = 9;
export const MAX_BANNERS = 3;

export type CategoryLabels = Record<Language, string>;

export type ManagedCategory = {
  key: string;
  sortOrder: number;
  labels: CategoryLabels;
  removable: boolean;
  fileCount: number;
};

export type CatalogBanner = {
  id: string;
  titles: CategoryLabels;
  messages: CategoryLabels;
  active: boolean;
  createdAt: string;
};

export type CatalogNoticeDefaults = {
  title: CategoryLabels;
  message: CategoryLabels;
};

export function isManagedCategoryKey(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 48;
}

const REPO_CATALOG_PREFIX = "repo:";

export function repoCatalogId(category: string, file: string): string {
  return `${REPO_CATALOG_PREFIX}${category}/${file}`;
}

/**
 * Repo catalog ids arrive from admin forms, so treat them as untrusted. Only a
 * managed category slug plus a plain PDF filename is accepted — no paths, no
 * traversal and no control characters. Spaces are allowed because older repo
 * catalogs used names like "Medical Equipment 1.pdf".
 */
export function parseRepoCatalogId(
  id: string,
): { category: string; file: string } | null {
  if (!id.startsWith(REPO_CATALOG_PREFIX)) return null;
  const value = id.slice(REPO_CATALOG_PREFIX.length);
  const slash = value.indexOf("/");
  if (slash <= 0 || slash !== value.lastIndexOf("/")) return null;

  const category = value.slice(0, slash);
  const file = value.slice(slash + 1);
  if (!isManagedCategoryKey(category)) return null;
  if (!file || file.length > 240 || !/\.pdf$/i.test(file)) return null;
  if (file.includes("/") || file.includes("\\") || file.includes("..")) return null;
  if (/[\u0000-\u001f\u007f]/.test(file)) return null;

  return { category, file };
}

export function slugifyCategory(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function suggestedCategoryKey(label: string, existingKeys: string[]): string {
  const base = slugifyCategory(label) || "category";
  if (!existingKeys.includes(base)) return base;
  let n = 2;
  while (existingKeys.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`.slice(0, 48);
}

export function labelFor(
  labels: Record<string, CategoryLabels>,
  key: string,
  lang: Language,
): string {
  return labels[key]?.[lang] || labels[key]?.en || key.replace(/-/g, " ");
}

export function textFor(
  values: CategoryLabels | undefined,
  lang: Language,
  fallback = "",
): string {
  return values?.[lang] || values?.en || fallback;
}
