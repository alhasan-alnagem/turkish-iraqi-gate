import Link from "next/link";
import { getTranslations } from "@/lib/translations";
import { CATEGORY_ORDER, listCatalogsByCategory } from "@/lib/catalogs";
import { toLang } from "@/lib/seo";

// Catalog PDFs can now be added or removed from the admin panel, so the list
// must be read on each request rather than baked in at build time.
export const dynamic = "force-dynamic";

type Params = { lang: string };

export default async function Catalogs({ params }: { params: Promise<Params> }) {
  const { lang: langParam } = await params;
  const t = getTranslations(toLang(langParam));
  const c = t.catalogs;
  const catalogs = await listCatalogsByCategory();

  return (
    <>
      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {c.hero.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {c.hero.title}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {c.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              {c.grid.title}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed max-w-2xl mx-auto">
              {c.grid.subtitle}
            </p>
          </div>

          <div className="relative">
            <div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 pointer-events-none select-none blur-[2px] opacity-40"
              aria-hidden="true"
            >
              {CATEGORY_ORDER.map((key) => {
                const pdfs = catalogs[key];
                return (
                  <div
                    key={key}
                    className="border border-[var(--border)] rounded-2xl bg-white shadow-sm p-6"
                  >
                    <h3 className="text-lg font-bold text-[var(--primary)] mb-4">
                      {c.categories[key] ?? key}
                    </h3>
                    {pdfs.length > 0 ? (
                      <ul className="space-y-3">
                        {pdfs.map((pdf) => (
                          <li key={pdf.id}>
                            <a
                              href={pdf.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block py-3 px-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--section)] transition-colors"
                            >
                              <span className="block font-medium text-[var(--primary)]">
                                {c.categories[key] ?? key} {pdf.index}
                              </span>
                              <span className="text-sm text-[var(--muted)]">{c.view}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="border-2 border-dashed border-[var(--border)] rounded-xl py-10 text-center">
                        <span className="inline-block px-4 py-1 rounded-full bg-[var(--section)] text-[var(--muted)] text-sm font-medium">
                          {c.comingSoonLabel}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl border border-amber-200 p-8 max-w-lg w-full text-center"
                role="status"
                aria-live="polite"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[var(--primary)] mb-2">
                  {c.notice.title}
                </h3>
                <p className="text-[var(--muted)]">{c.notice.message}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
            {c.cta.title}
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-xl mx-auto">
            {c.cta.subtitle}
          </p>
          <Link
            href={`/${toLang(langParam)}/contact`}
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {c.cta.button}
          </Link>
        </div>
      </section>

      <section className="bg-white border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
            {c.supplier.title}
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-xl mx-auto">
            {c.supplier.subtitle}
          </p>
          <Link
            href={`/${toLang(langParam)}/submit-catalog`}
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {c.supplier.button}
          </Link>
        </div>
      </section>
    </>
  );
}
