"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";

export default function Services() {
  const { t } = useLanguage();
  const s = t.services;

  return (
    <>
      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {s.hero.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {s.hero.title}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {s.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-8">
            {s.list.map((service) => (
              <div
                key={service.title}
                className="border border-[var(--border)] rounded-xl p-8 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-4">{service.icon}</div>
                <h2 className="text-xl font-bold text-[var(--primary)] mb-3">
                  {service.title}
                </h2>
                <p className="text-[var(--muted)] leading-relaxed">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
              {s.pricing.title}
            </h2>
            <p className="text-[var(--muted)] mt-4 max-w-2xl mx-auto">
              {s.pricing.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-[var(--primary)] mb-3">
                {s.pricing.flatFee.title}
              </h3>
              <p className="text-[var(--muted)] leading-relaxed">
                {s.pricing.flatFee.desc}
              </p>
            </div>
            <div className="bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-[var(--primary)] mb-3">
                {s.pricing.deposit.title}
              </h3>
              <p className="text-[var(--muted)] leading-relaxed">
                {s.pricing.deposit.desc}
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <p className="text-[var(--muted)] text-sm max-w-xl mx-auto">
              {s.pricing.note}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
              {s.categories.title}
            </h2>
            <p className="text-[var(--muted)] mt-4 max-w-2xl mx-auto">
              {s.categories.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {s.categories.groups.map((category) => (
              <div
                key={category.title}
                className="bg-[var(--surface)] p-8 rounded-xl shadow-sm border border-[var(--border)]"
              >
                <h3 className="text-xl font-bold text-[var(--primary)] mb-4">
                  {category.title}
                </h3>
                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-[var(--muted)] text-sm"
                    >
                      <span className="text-[var(--accent)]">&bull;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-[var(--muted)] mb-6">
              {s.categories.missing}
            </p>
            <Link
              href="/contact"
              className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
            >
              {s.categories.button}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {s.cta.title}
          </h2>
          <p className="text-white/70 mb-8">
            {s.cta.subtitle}
          </p>
          <Link
            href="/contact"
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {s.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
