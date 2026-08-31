import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { getTranslations } from "@/lib/translations";
import { toLang } from "@/lib/seo";

const CATEGORY_ORDER = [
  "medical-equipment",
  "construction-materials",
  "specialized-equipment",
  "electronics",
  "automotive-parts",
  "furniture",
  "textiles-apparel",
  "industrial-machinery",
] as const;

function listPdfs(folder: string): string[] {
  const dir = path.join(process.cwd(), "public", "catalogs", folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();
}

function prettyName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
}

type Params = { lang: string };

export default async function Catalogs({ params }: { params: Promise<Params> }) {
  const { lang: langParam } = await params;
  const t = getTranslations(toLang(langParam));
  const c = t.catalogs;

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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CATEGORY_ORDER.map((key) => {
              const pdfs = listPdfs(key);
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
                        <li key={pdf}>
                          <a
                            href={`/catalogs/${key}/${pdf}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block py-3 px-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--section)] transition-colors"
                          >
                            <span className="block font-medium text-[var(--primary)]">
                              {prettyName(pdf)}
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
    </>
  );
}
