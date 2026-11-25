"use client";

import {
  addBannerAction,
  deleteBannerAction,
  toggleBannerAction,
  updateBannerAction,
} from "@/app/admin/actions";
import {
  MAX_BANNERS,
  type CatalogBanner,
  type CatalogNoticeDefaults,
} from "@/lib/catalog-settings-shared";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";
const textareaClass = `${inputClass} min-h-[76px] resize-y`;
const smallButton =
  "rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--section)]";
const dangerButton =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50";

function LanguageFields({
  idPrefix,
  prefix,
  label,
  values,
  defaults,
  multiline = false,
}: {
  idPrefix: string;
  prefix: string;
  label: string;
  values?: { en: string; ar: string; tr: string };
  defaults: { en: string; ar: string; tr: string };
  multiline?: boolean;
}) {
  const languages = [
    { code: "En", label: "English", dir: "ltr" },
    { code: "Ar", label: "العربية", dir: "rtl" },
    { code: "Tr", label: "Türkçe", dir: "ltr" },
  ] as const;

  return (
    <fieldset>
      <legend className="mb-1 text-[11px] font-medium text-[var(--muted)]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {languages.map((language) => {
          const name = `${prefix}${language.code}`;
          const id = `${idPrefix}-${language.code}`;
          const defaultValue = values?.[language.code.toLowerCase() as "en" | "ar" | "tr"]
            ?? defaults[language.code.toLowerCase() as "en" | "ar" | "tr"];
          return (
            <label key={name} htmlFor={id} className="block">
              <span className="sr-only">{language.label}</span>
              {multiline ? (
                <textarea
                  id={id}
                  name={name}
                  defaultValue={defaultValue}
                  dir={language.dir}
                  maxLength={500}
                  className={textareaClass}
                />
              ) : (
                <input
                  id={id}
                  name={name}
                  defaultValue={defaultValue}
                  dir={language.dir}
                  maxLength={160}
                  className={inputClass}
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function BannerManager({
  banners,
  defaults,
}: {
  banners: CatalogBanner[];
  defaults: CatalogNoticeDefaults;
}) {
  const atCap = banners.length >= MAX_BANNERS;

  return (
    <section className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-xl font-bold text-[var(--primary)]">Catalog banners</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          An active banner covers the catalog grid with a notice — useful during updates.
          Remove it or switch it off to make the PDFs live again. Text can be written in all
          three site languages; English is used when another language is left blank.
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {banners.length}/{MAX_BANNERS} banners · {banners.filter((banner) => banner.active).length} active
        </p>
      </div>

      {banners.length ? (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--section)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {banner.titles.en}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {banner.active ? "Active — shown on the catalogs page" : "Inactive"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={toggleBannerAction}>
                    <input type="hidden" name="id" value={banner.id} />
                    <input type="hidden" name="active" value={String(banner.active)} />
                    <input type="hidden" name="tab" value="banners" />
                    <button type="submit" className={smallButton}>
                      {banner.active ? "Switch off" : "Activate"}
                    </button>
                  </form>
                  <form action={deleteBannerAction}>
                    <input type="hidden" name="id" value={banner.id} />
                    <input type="hidden" name="tab" value="banners" />
                    <button
                      type="submit"
                      className={dangerButton}
                      onClick={(event) => {
                        if (!window.confirm(`Remove the "${banner.titles.en}" banner?`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              <form action={updateBannerAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={banner.id} />
                <input type="hidden" name="tab" value="banners" />
                <LanguageFields
                  idPrefix={`banner-${banner.id}-title`}
                  prefix="title"
                  label="Title"
                  values={banner.titles}
                  defaults={defaults.title}
                />
                <LanguageFields
                  idPrefix={`banner-${banner.id}-message`}
                  prefix="message"
                  label="Message"
                  values={banner.messages}
                  defaults={defaults.message}
                  multiline
                />
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={banner.active}
                      className="h-4 w-4 rounded border-[var(--border)]"
                    />
                    Show on catalogs page
                  </label>
                  <button type="submit" className={smallButton}>
                    Save banner
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          No banners. Catalog PDFs are live.
        </p>
      )}

      <form action={addBannerAction} className="rounded-xl border border-dashed border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--primary)]">Add a banner</h3>
        <input type="hidden" name="tab" value="banners" />
        <div className="mt-3 space-y-3">
          <LanguageFields idPrefix="new-title" prefix="title" label="Title" defaults={defaults.title} />
          <LanguageFields idPrefix="new-message" prefix="message" label="Message" defaults={defaults.message} multiline />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={atCap}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add banner
          </button>
          {atCap ? (
            <span className="text-xs text-amber-700">
              Limit reached — remove a banner before adding another.
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
