import "server-only";

import { query } from "@/lib/db";
import { ADMIN_CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/catalog-types";
import { getTranslations } from "@/lib/translations";
import {
  MAX_BANNERS,
  MAX_CATEGORIES,
  isManagedCategoryKey,
  parseRepoCatalogId,
  type CatalogBanner,
  type CategoryLabels,
  type ManagedCategory,
} from "@/lib/catalog-settings-shared";

/**
 * Admin-managed catalog categories and catalog-page banners.
 *
 * Categories keep their slug (`medical-equipment`, etc.) so existing repo and
 * Blob PDF paths never change; only the public labels and display order are
 * stored here. The cap keeps the public 3-column grid tidy — too many cards
 * makes the catalogs page look like a wall of boxes.
 */

export {
  MAX_BANNERS,
  MAX_CATEGORIES,
  isManagedCategoryKey,
  labelFor,
  parseRepoCatalogId,
  repoCatalogId,
  slugifyCategory,
  suggestedCategoryKey,
  textFor,
} from "@/lib/catalog-settings-shared";
export type {
  CatalogBanner,
  CatalogNoticeDefaults,
  CategoryLabels,
  ManagedCategory,
} from "@/lib/catalog-settings-shared";

type CategoryRow = {
  key: string;
  sort_order: number;
  label_en: string;
  label_ar: string;
  label_tr: string;
  built_in: boolean;
};

type BannerRow = {
  id: string;
  /** Legacy single-language columns, kept for any banner written before localization. */
  title: string;
  message: string;
  title_en: string;
  title_ar: string;
  title_tr: string;
  message_en: string;
  message_ar: string;
  message_tr: string;
  active: boolean;
  created_at: string | Date;
};

const TRANSLATED_CATEGORY_LABELS = {
  en: getTranslations("en").catalogs.categories,
  ar: getTranslations("ar").catalogs.categories,
  tr: getTranslations("tr").catalogs.categories,
};

const BUILTIN_LABELS: Record<string, CategoryLabels> = Object.fromEntries(
  CATEGORY_ORDER.map((key) => [
    key,
    {
      en: TRANSLATED_CATEGORY_LABELS.en[key] || ADMIN_CATEGORY_LABELS[key],
      ar: TRANSLATED_CATEGORY_LABELS.ar[key] || "",
      tr: TRANSLATED_CATEGORY_LABELS.tr[key] || "",
    },
  ]),
);

function labelsFrom(row: CategoryRow): CategoryLabels {
  const fallback = BUILTIN_LABELS[row.key] ?? {
    en: row.key.replace(/-/g, " "),
    ar: "",
    tr: "",
  };
  return {
    en: row.label_en?.trim() || fallback.en,
    ar: row.label_ar?.trim() || fallback.ar || fallback.en,
    tr: row.label_tr?.trim() || fallback.tr || fallback.en,
  };
}

function normalizeLabels(values: CategoryLabels, max: number, requireEn = false): CategoryLabels | null {
  const en = String(values.en ?? "").trim().slice(0, max);
  if (requireEn && !en) return null;
  return {
    en,
    ar: String(values.ar ?? "").trim().slice(0, max) || en,
    tr: String(values.tr ?? "").trim().slice(0, max) || en,
  };
}

function bannerText(row: BannerRow, kind: "title" | "message"): CategoryLabels {
  const legacy = String(row[kind] ?? "").trim();
  const values = {
    en: String(row[`${kind}_en`] ?? "").trim() || legacy,
    ar: String(row[`${kind}_ar`] ?? "").trim(),
    tr: String(row[`${kind}_tr`] ?? "").trim(),
  };
  return {
    en: values.en,
    ar: values.ar || values.en,
    tr: values.tr || values.en,
  };
}

export async function getManagedCategories(
  fileCounts: Record<string, number> = {},
): Promise<ManagedCategory[]> {
  const rows = await query<CategoryRow>(
    `select key, sort_order, label_en, label_ar, label_tr, built_in
     from catalog_categories order by sort_order, key`,
  );

  return rows.map((row) => ({
    key: row.key,
    sortOrder: row.sort_order,
    labels: labelsFrom(row),
    removable: !row.built_in,
    fileCount: fileCounts[row.key] ?? 0,
  }));
}

/** Category keys used by the public page and by Blob upload validation. */
export async function getCategoryKeys(): Promise<string[]> {
  const rows = await query<{ key: string }>(
    `select key from catalog_categories order by sort_order, key`,
  );
  return rows.length ? rows.map((row) => row.key) : [...CATEGORY_ORDER];
}

export async function getCategoryLabels(): Promise<Record<string, CategoryLabels>> {
  const rows = await query<CategoryRow>(
    `select key, sort_order, label_en, label_ar, label_tr, built_in
     from catalog_categories order by sort_order, key`,
  );
  if (!rows.length) return { ...BUILTIN_LABELS };
  return Object.fromEntries(rows.map((row) => [row.key, labelsFrom(row)]));
}

/** Ids of repo PDFs the admin has hidden from the public catalogs. */
export async function getHiddenCatalogIds(): Promise<Set<string>> {
  const rows = await query<{ id: string }>(`select id from catalog_hidden_files`);
  return new Set(rows.map((row) => row.id));
}

/** Hide a committed repo PDF without trying to edit the deployed filesystem. */
export async function hideCatalogFile(id: string): Promise<boolean> {
  if (!parseRepoCatalogId(id)) return false;
  await query(
    `insert into catalog_hidden_files (id) values ($1)
     on conflict (id) do nothing`,
    [id],
  );
  return true;
}

/** Put a hidden repo PDF back on the public catalogs page. */
export async function restoreCatalogFile(id: string): Promise<boolean> {
  if (!parseRepoCatalogId(id)) return false;
  const result = await query<{ id: string }>(
    `delete from catalog_hidden_files where id = $1 returning id`,
    [id],
  );
  return result.length > 0;
}

export async function renameCategory(
  key: string,
  labels: CategoryLabels,
): Promise<boolean> {
  const result = await query<{ key: string }>(
    `update catalog_categories
     set label_en = $2, label_ar = $3, label_tr = $4, updated_at = now()
     where key = $1 returning key`,
    [
      key,
      String(labels.en ?? "").trim().slice(0, 120),
      String(labels.ar ?? "").trim().slice(0, 120),
      String(labels.tr ?? "").trim().slice(0, 120),
    ],
  );
  return result.length > 0;
}

export async function moveCategory(key: string, direction: -1 | 1): Promise<boolean> {
  const rows = await query<{ key: string; sort_order: number }>(
    `select key, sort_order from catalog_categories order by sort_order, key`,
  );
  const index = rows.findIndex((row) => row.key === key);
  if (index < 0) return false;
  const target = index + direction;
  if (target < 0 || target >= rows.length) return false;

  const current = rows[index];
  const other = rows[target];
  await query(
    `update catalog_categories set sort_order = $2, updated_at = now() where key = $1`,
    [current.key, other.sort_order],
  );
  await query(
    `update catalog_categories set sort_order = $2, updated_at = now() where key = $1`,
    [other.key, current.sort_order],
  );
  return true;
}

export async function addCategory(
  key: string,
  labels: CategoryLabels,
): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  if (!isManagedCategoryKey(key)) {
    return { ok: false, error: "Use letters, numbers and dashes only (max 48 characters)." };
  }
  const clean = normalizeLabels(labels, 120, true);
  if (!clean) return { ok: false, error: "English label is required." };

  const count = await query<{ count: string }>(
    `select count(*)::text as count from catalog_categories`,
  );
  if (Number(count[0]?.count ?? 0) >= MAX_CATEGORIES) {
    return {
      ok: false,
      error: `A maximum of ${MAX_CATEGORIES} categories is allowed to keep the catalogs page tidy.`,
    };
  }

  const existing = await query<{ key: string }>(
    `select key from catalog_categories where key = $1`,
    [key],
  );
  if (existing.length) return { ok: false, error: "That category key already exists." };

  const max = await query<{ max: string | null }>(
    `select max(sort_order)::text as max from catalog_categories`,
  );
  const nextOrder = Number(max[0]?.max ?? 0) + 1;

  await query(
    `insert into catalog_categories
       (key, sort_order, label_en, label_ar, label_tr, built_in)
     values ($1, $2, $3, $4, $5, false)`,
    [key, nextOrder, clean.en, clean.ar, clean.tr],
  );
  return { ok: true, key };
}

export async function deleteCategory(key: string): Promise<{ ok: boolean; error?: string }> {
  const row = await query<{ built_in: boolean }>(
    `select built_in from catalog_categories where key = $1`,
    [key],
  );
  if (!row.length) return { ok: false, error: "Category not found." };
  if (row[0].built_in) {
    return {
      ok: false,
      error: "Built-in categories cannot be deleted; rename them instead.",
    };
  }
  await query(`delete from catalog_categories where key = $1 and built_in = false`, [key]);
  return { ok: true };
}

export async function getBanners(): Promise<CatalogBanner[]> {
  const rows = await query<BannerRow>(
    `select id, title, message, title_en, title_ar, title_tr,
            message_en, message_ar, message_tr, active, created_at
     from catalog_banners order by active desc, created_at desc`,
  );
  return rows.map((row) => ({
    id: row.id,
    titles: bannerText(row, "title"),
    messages: bannerText(row, "message"),
    active: Boolean(row.active),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function addBanner(
  titles: CategoryLabels,
  messages: CategoryLabels,
): Promise<{ ok: boolean; error?: string }> {
  const cleanTitles = normalizeLabels(titles, 160, true);
  const cleanMessages = normalizeLabels(messages, 500, true);
  if (!cleanTitles || !cleanMessages) {
    return { ok: false, error: "English title and message are required." };
  }

  const count = await query<{ count: string }>(
    `select count(*)::text as count from catalog_banners`,
  );
  if (Number(count[0]?.count ?? 0) >= MAX_BANNERS) {
    return {
      ok: false,
      error: `A maximum of ${MAX_BANNERS} banners is allowed. Remove one before adding another.`,
    };
  }

  await query(
    `insert into catalog_banners
       (title, message, title_en, title_ar, title_tr,
        message_en, message_ar, message_tr, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
    [
      cleanTitles.en,
      cleanMessages.en,
      cleanTitles.en,
      cleanTitles.ar,
      cleanTitles.tr,
      cleanMessages.en,
      cleanMessages.ar,
      cleanMessages.tr,
    ],
  );
  return { ok: true };
}

export async function updateBanner(
  id: string,
  values: {
    titles?: CategoryLabels;
    messages?: CategoryLabels;
    active?: boolean;
  },
): Promise<boolean> {
  const fields: string[] = [];
  const params: unknown[] = [];

  function set(value: unknown, column: string): void {
    params.push(value);
    fields.push(`${column} = $${params.length}`);
  }

  if (values.titles) {
    const titles = normalizeLabels(values.titles, 160);
    if (titles) {
      set(titles.en, "title");
      set(titles.en, "title_en");
      set(titles.ar, "title_ar");
      set(titles.tr, "title_tr");
    }
  }
  if (values.messages) {
    const messages = normalizeLabels(values.messages, 500);
    if (messages) {
      set(messages.en, "message");
      set(messages.en, "message_en");
      set(messages.ar, "message_ar");
      set(messages.tr, "message_tr");
    }
  }
  if (values.active !== undefined) set(values.active, "active");
  if (!fields.length) return false;

  params.push(id);
  const result = await query<{ id: string }>(
    `update catalog_banners set ${fields.join(", ")}, updated_at = now()
     where id = $${params.length} returning id`,
    params,
  );
  return result.length > 0;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    `delete from catalog_banners where id = $1 returning id`,
    [id],
  );
  return result.length > 0;
}
