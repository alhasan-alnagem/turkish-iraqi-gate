/** Catalog constants and types shared by server and client code. */

/**
 * Original slugs kept as legacy label/type helpers only. They are not seeded
 * or rendered automatically — the admin can delete them for good, and new
 * categories use the same slug shape.
 */
export const CATEGORY_ORDER = [
  "medical-equipment",
  "construction-materials",
  "specialized-equipment",
  "electronics",
  "automotive-parts",
  "furniture",
  "textiles-apparel",
  "industrial-machinery",
] as const;

export type BuiltinCategoryKey = (typeof CATEGORY_ORDER)[number];

/** Category keys are dynamic now, but remain stable slugs on disk/in Blob. */
export type CategoryKey = string;

/** English labels for the built-in admin fallbacks (public site uses DB labels). */
export const ADMIN_CATEGORY_LABELS: Record<BuiltinCategoryKey, string> = {
  "medical-equipment": "Medical Equipment",
  "construction-materials": "Construction Materials",
  "specialized-equipment": "Specialized Equipment",
  electronics: "Electronics",
  "automotive-parts": "Automotive Parts",
  furniture: "Furniture",
  "textiles-apparel": "Textiles & Apparel",
  "industrial-machinery": "Industrial Machinery",
};

export type CatalogEntry = {
  /** Stable identifier used as a React key and for delete requests. */
  id: string;
  category: CategoryKey;
  /** 1-based position inside the category — the public number in "Medical Equipment 1". */
  index: number;
  href: string;
  source: "repo" | "blob";
  /** Repo PDFs kept in the admin list but removed from the public catalogs. */
  hidden?: boolean;
  uploadedAt?: string;
  size?: number;
};

export type CatalogsByCategory = Record<CategoryKey, CatalogEntry[]>;

export function isCategoryKey(value: string): value is BuiltinCategoryKey {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
}
