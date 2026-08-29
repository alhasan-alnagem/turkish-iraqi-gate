"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";

export default function About() {
  const { t, lang } = useLanguage();
  const l = (path: string) => `/${lang}${path}`;
  const a = t.about;

  return (
    <>
      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {a.hero.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {a.hero.title}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {a.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[var(--primary)] mb-6">
                {a.story.title}
              </h2>
              <div className="space-y-4 text-[var(--muted)] leading-relaxed">
                {a.story.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            <div className="bg-[var(--section)] rounded-2xl p-12 text-center">
              <div className="text-6xl font-bold text-[var(--primary)] mb-2">
                {a.story.years}
              </div>
              <p className="text-[var(--muted)]">{a.story.yearsLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--primary)]">
              {a.values.title}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {a.values.items.map((value) => (
              <div
                key={value.title}
                className="bg-[var(--surface)] p-8 rounded-xl shadow-sm border border-[var(--border)]"
              >
                <h3 className="text-xl font-bold text-[var(--primary)] mb-3">
                  {value.title}
                </h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-bold mb-6">{a.offices.title}</h2>
              <div className="space-y-6">
                <div className="border-l-4 border-[var(--accent-light)] pl-4">
                  <h3 className="font-bold text-lg">{a.offices.istanbul.title}</h3>
                  <p className="text-white/60 text-sm mt-1">
                    {a.offices.istanbul.desc}
                  </p>
                </div>
                <div className="border-l-4 border-[var(--accent-light)] pl-4">
                  <h3 className="font-bold text-lg">{a.offices.baghdad.title}</h3>
                  <p className="text-white/60 text-sm mt-1">
                    {a.offices.baghdad.desc}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-6">{a.team.title}</h2>
              <div className="space-y-6">
                <div className="border-l-4 border-[var(--accent-light)] pl-4">
                  <h3 className="font-bold text-lg">{a.team.founder.name}</h3>
                  <p className="text-[var(--accent-light)] text-sm">
                    {a.team.founder.role}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    {a.team.founder.exp}
                  </p>
                </div>
                <div className="border-l-4 border-[var(--accent-light)] pl-4">
                  <h3 className="font-bold text-lg">{a.team.director.name}</h3>
                  <p className="text-[var(--accent-light)] text-sm">
                    {a.team.director.role}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    {a.team.director.exp}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-[var(--primary)] mb-4">
            {a.cta.title}
          </h2>
          <p className="text-[var(--muted)] mb-8">
            {a.cta.subtitle}
          </p>
          <Link
            href={l("/contact")}
            className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            {a.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
