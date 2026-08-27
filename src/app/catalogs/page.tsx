"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";

function PdfIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6Zm7 2v5h5v11H6V4h7Zm-4 8h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 4h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z" />
    </svg>
  );
}

export default function Catalogs() {
  const { t } = useLanguage();
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              {c.grid.title}
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              {c.grid.subtitle}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {c.categories.map((cat) => (
              <a
                key={cat.name}
                href={`/catalogs/${cat.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[var(--section)] rounded-xl p-6 flex flex-col hover:bg-white hover:shadow-lg hover:border-[var(--accent)] border border-transparent transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-5xl leading-none">{cat.image}</span>
                  <span className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <PdfIcon />
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[var(--primary)] mb-2">
                  {cat.name}
                </h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-6 flex-1">
                  {cat.desc}
                </p>
                <span className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <PdfIcon />
                  {c.download}
                </span>
              </a>
            ))}
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
            href="/contact"
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {c.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
