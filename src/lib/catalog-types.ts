/** Catalog constants and types shared by server and client code. */

/** Fixed display order for catalog categories (see AGENTS.md §5). */
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

export type CategoryKey = (typeof CATEGORY_ORDER)[number];

/** English labels for the admin panel (the public site uses the translation files). */
export const ADMIN_CATEGORY_LABELS: Record<CategoryKey, string> = {
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
  uploadedAt?: string;
  size?: number;
};

export type CatalogsByCategory = Record<CategoryKey, CatalogEntry[]>;

export function isCategoryKey(value: string): value is CategoryKey {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
}
