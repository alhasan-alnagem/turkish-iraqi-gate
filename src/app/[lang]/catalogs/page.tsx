"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";

export default function Catalogs() {
  const { t, lang } = useLanguage();
  const l = (path: string) => `/${lang}${path}`;
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
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <div className="text-5xl mb-6">📂</div>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
            {c.comingSoon.title}
          </h2>
          <p className="text-[var(--muted)] leading-relaxed">
            {c.comingSoon.message}
          </p>
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
            href={l("/contact")}
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {c.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
