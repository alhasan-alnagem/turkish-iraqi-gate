"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";

export default function Products() {
  const { t } = useLanguage();
  const p = t.products;

  return (
    <>
      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {p.hero.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {p.hero.title}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {p.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="space-y-20">
            {p.categories.map((category, index) => (
              <div
                key={category.name}
                className="grid md:grid-cols-2 gap-12 items-start"
              >
                <div
                  className={`${index % 2 === 1 ? "md:order-2" : ""}`}
                >
                  <div className="text-5xl mb-4">{category.image}</div>
                  <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">
                    {category.name}
                  </h2>
                  <p className="text-[var(--muted)] leading-relaxed mb-6">
                    {category.desc}
                  </p>
                  <Link
                    href="/contact"
                    className="text-[var(--accent)] font-semibold hover:underline"
                  >
                    {category.inquiry} &rarr;
                  </Link>
                </div>
                <div
                  className={`bg-[var(--section)] rounded-xl p-8 ${
                    index % 2 === 1 ? "md:order-1" : ""
                  }`}
                >
                  <h3 className="font-bold text-[var(--primary)] mb-4">
                    Products We Supply
                  </h3>
                  <ul className="space-y-3">
                    {category.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 text-sm text-[var(--muted)]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
            {p.cta.title}
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-xl mx-auto">
            {p.cta.subtitle}
          </p>
          <Link
            href="/contact"
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {p.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
