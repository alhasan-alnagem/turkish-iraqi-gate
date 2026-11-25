"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listCatalogsByCategory } from "@/lib/catalogs";
import {
  addBanner,
  addCategory,
  deleteBanner,
  deleteCategory,
  getCategoryKeys,
  hideCatalogFile,
  isManagedCategoryKey,
  moveCategory,
  parseRepoCatalogId,
  renameCategory,
  restoreCatalogFile,
  suggestedCategoryKey,
  updateBanner,
  type CategoryLabels,
} from "@/lib/catalog-settings";

function formString(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function labelsFromForm(formData: FormData, prefix: string): CategoryLabels {
  return {
    en: formString(formData, `${prefix}En`),
    ar: formString(formData, `${prefix}Ar`),
    tr: formString(formData, `${prefix}Tr`),
  };
}

function backParams(formData: FormData, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  const tab = formString(formData, "tab");
  if (tab) params.set("tab", tab);
  return params.toString();
}

function goBack(formData: FormData, extra: Record<string, string> = {}): never {
  const query = backParams(formData, extra);
  redirect(query ? `/admin?${query}` : "/admin");
}

function fail(formData: FormData, error: string): never {
  goBack(formData, { error: encodeURIComponent(error) });
}

function revalidateCatalogs(): void {
  revalidatePath("/admin");
  revalidatePath("/en/catalogs");
  revalidatePath("/ar/catalogs");
  revalidatePath("/tr/catalogs");
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/login");
}

export async function renameCategoryAction(formData: FormData) {
  await requireAdmin();
  const key = formString(formData, "key");
  if (!isManagedCategoryKey(key)) fail(formData, "Invalid category.");
  const labels = labelsFromForm(formData, "label");
  if (!labels.en) fail(formData, "English label is required.");
  if (!(await renameCategory(key, labels))) fail(formData, "Category not found.");
  revalidateCatalogs();
  goBack(formData, { ok: "category-renamed" });
}

export async function moveCategoryAction(formData: FormData) {
  await requireAdmin();
  const key = formString(formData, "key");
  const direction = formString(formData, "direction") === "up" ? -1 : 1;
  if (!(await moveCategory(key, direction))) fail(formData, "Category could not be moved.");
  revalidateCatalogs();
  goBack(formData);
}

export async function addCategoryAction(formData: FormData) {
  await requireAdmin();
  const labels = labelsFromForm(formData, "label");
  if (!labels.en) fail(formData, "English label is required.");
  const existing = await getCategoryKeys();
  const key = formString(formData, "key") || suggestedCategoryKey(labels.en, existing);
  const result = await addCategory(key, labels);
  if (!result.ok) fail(formData, result.error);
  revalidateCatalogs();
  goBack(formData, { ok: "category-added" });
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const key = formString(formData, "key");
  if (!isManagedCategoryKey(key)) fail(formData, "Invalid category.");

  const grouped = await listCatalogsByCategory();
  const fileCount = grouped[key]?.length ?? 0;
  if (fileCount > 0) {
    fail(
      formData,
      `Remove the ${fileCount} PDF${fileCount === 1 ? "" : "s"} in this category before deleting it.`,
    );
  }

  const result = await deleteCategory(key);
  if (!result.ok) fail(formData, result.error ?? "Category could not be deleted.");
  revalidateCatalogs();
  goBack(formData, { ok: "category-deleted" });
}

export async function hideRepoCatalogAction(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (!parseRepoCatalogId(id)) fail(formData, "Invalid catalog file.");
  if (!(await hideCatalogFile(id))) fail(formData, "Catalog could not be hidden.");
  revalidateCatalogs();
  goBack(formData, { ok: "catalog-hidden" });
}

export async function restoreRepoCatalogAction(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (!parseRepoCatalogId(id)) fail(formData, "Invalid catalog file.");
  if (!(await restoreCatalogFile(id))) fail(formData, "Catalog could not be restored.");
  revalidateCatalogs();
  goBack(formData, { ok: "catalog-restored" });
}

export async function addBannerAction(formData: FormData) {
  await requireAdmin();
  const result = await addBanner(
    labelsFromForm(formData, "title"),
    labelsFromForm(formData, "message"),
  );
  if (!result.ok) fail(formData, result.error ?? "Banner could not be added.");
  revalidateCatalogs();
  goBack(formData, { ok: "banner-added" });
}

export async function updateBannerAction(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (!id) fail(formData, "Banner not found.");
  const ok = await updateBanner(id, {
    titles: labelsFromForm(formData, "title"),
    messages: labelsFromForm(formData, "message"),
    active: formData.get("active") === "on",
  });
  if (!ok) fail(formData, "Banner not found.");
  revalidateCatalogs();
  goBack(formData, { ok: "banner-updated" });
}

export async function toggleBannerAction(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (!id) fail(formData, "Banner not found.");
  const active = formString(formData, "active") === "true";
  if (!(await updateBanner(id, { active: !active }))) fail(formData, "Banner not found.");
  revalidateCatalogs();
  goBack(formData);
}

export async function deleteBannerAction(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (!id) fail(formData, "Banner not found.");
  if (!(await deleteBanner(id))) fail(formData, "Banner not found.");
  revalidateCatalogs();
  goBack(formData, { ok: "banner-deleted" });
}
