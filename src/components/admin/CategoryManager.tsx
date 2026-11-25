"use client";

import {
  addCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  renameCategoryAction,
} from "@/app/admin/actions";
import { MAX_CATEGORIES, type ManagedCategory } from "@/lib/catalog-settings-shared";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";
const smallButton =
  "rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--section)] disabled:cursor-not-allowed disabled:opacity-50";

export default function CategoryManager({ categories }: { categories: ManagedCategory[] }) {
  const atCap = categories.length >= MAX_CATEGORIES;

  return (
    <section className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-xl font-bold text-[var(--primary)]">Catalog categories</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Rename, reorder, add or remove the category cards on the catalogs page. Keys stay
          stable so existing PDF paths never break. Maximum {MAX_CATEGORIES} categories keeps
          the page tidy.
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Currently {categories.length}/{MAX_CATEGORIES} categories.
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((category, index) => (
          <div
            key={category.key}
            className="rounded-xl border border-[var(--border)] bg-[var(--section)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--muted)]">
                {category.key} · {category.fileCount} file{category.fileCount === 1 ? "" : "s"}
                {category.removable ? "" : " · built-in"}
              </p>
              <div className="flex items-center gap-1.5">
                <form action={moveCategoryAction}>
                  <input type="hidden" name="key" value={category.key} />
                  <input type="hidden" name="direction" value="up" />
                  <input type="hidden" name="tab" value="categories" />
                  <button type="submit" disabled={index === 0} className={smallButton} title="Move up">
                    ↑
                  </button>
                </form>
                <form action={moveCategoryAction}>
                  <input type="hidden" name="key" value={category.key} />
                  <input type="hidden" name="direction" value="down" />
                  <input type="hidden" name="tab" value="categories" />
                  <button
                    type="submit"
                    disabled={index === categories.length - 1}
                    className={smallButton}
                    title="Move down"
                  >
                    ↓
                  </button>
                </form>
                {category.removable ? (
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="key" value={category.key} />
                    <input type="hidden" name="tab" value="categories" />
                    <button
                      type="submit"
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      onClick={(event) => {
                        if (
                          !window.confirm(
                            `Delete the "${category.labels.en}" category? Categories with PDFs must be emptied first.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <form action={renameCategoryAction} className="mt-3 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="key" value={category.key} />
              <input type="hidden" name="tab" value="categories" />
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--muted)]">English</span>
                <input name="labelEn" defaultValue={category.labels.en} required className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--muted)]">العربية</span>
                <input name="labelAr" defaultValue={category.labels.ar} dir="rtl" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--muted)]">Türkçe</span>
                <input name="labelTr" defaultValue={category.labels.tr} className={inputClass} />
              </label>
              <div className="sm:col-span-3">
                <button type="submit" className={smallButton}>Save labels</button>
              </div>
            </form>
          </div>
        ))}
      </div>

      <form action={addCategoryAction} className="rounded-xl border border-dashed border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--primary)]">Add a category</h3>
        <input type="hidden" name="tab" value="categories" />
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1 block text-[11px] text-[var(--muted)]">English (required)</span>
            <input name="labelEn" required disabled={atCap} placeholder="e.g. Lab Supplies" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-[var(--muted)]">العربية</span>
            <input name="labelAr" dir="rtl" disabled={atCap} placeholder="مثال: مستلزمات مختبرات" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-[var(--muted)]">Türkçe</span>
            <input name="labelTr" disabled={atCap} placeholder="Örn.: Laboratuvar Malzemeleri" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-[var(--muted)]">Key (optional)</span>
            <input name="key" disabled={atCap} placeholder="lab-supplies" className={inputClass} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={atCap}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add category
          </button>
          {atCap ? (
            <span className="text-xs text-amber-700">
              Limit reached — remove a category before adding another.
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
