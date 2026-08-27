"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import LanguagePopup from "@/components/LanguagePopup";

export default function Home() {
  const { t } = useLanguage();
  const h = t.home;

  return (
    <>
      <LanguagePopup />      <section className="relative bg-[var(--primary)] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {h.hero.tag}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {h.hero.title}{" "}
              <span className="text-[var(--accent-light)]">{h.hero.titleAccent}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl leading-relaxed">
              {h.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {h.hero.cta}
              </Link>
              <Link
                href="/services"
                className="border border-white/30 hover:border-white/50 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {h.hero.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {h.stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--muted)] mt-2">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
              {h.howItWorks.title}
            </h2>
            <p className="text-[var(--muted)] mt-4 max-w-2xl mx-auto">
              {h.howItWorks.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {h.howItWorks.steps.map((item, i) => (
              <div
                key={i}
                className="bg-[var(--surface)] p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-[var(--border)] text-center"
              >
                <div className="text-[var(--accent)] font-bold text-4xl mb-4">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-xl font-bold text-[var(--primary)] mb-3">
                  {item.title}
                </h3>
                <p className="text-[var(--muted)] leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              {h.whyUs.title}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {h.whyUs.items.map((item) => (
              <div
                key={item.title}
                className="bg-white/10 p-8 rounded-xl backdrop-blur-sm"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/70 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
              {h.products.title}
            </h2>
            <p className="text-[var(--muted)] mt-4 max-w-2xl mx-auto">
              {h.products.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {h.products.categories.map((cat) => (
              <div
                key={cat}
                className="border border-[var(--border)] rounded-lg px-6 py-4 text-center text-sm font-medium text-[var(--primary)] hover:border-[var(--accent)] hover:bg-[var(--section)] transition-colors"
              >
                {cat}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-[var(--muted)] text-sm">
              {h.products.missing}{" "}
              <Link href="/contact" className="text-[var(--accent)] hover:underline font-semibold">
                {h.products.missingLink}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
            {h.cta.title}
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-xl mx-auto">
            {h.cta.subtitle}
          </p>
          <Link
            href="/contact"
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {h.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
