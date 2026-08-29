"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { languages } from "@/lib/translations";

export default function LanguageSwitcher() {
  const { lang, switchLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = languages.find((l) => l.code === lang);
  // Show the target language (the one you'd switch to) so users who
  // accidentally land on the wrong language can clearly see how to switch.
  const target = languages.find((l) => l.code !== lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-white/80 hover:text-[var(--accent-light)] transition-colors text-sm font-medium px-2 py-1 rounded border border-white/20 hover:border-white/40"
        title={current ? `Currently: ${current.label}` : undefined}
      >
        {target?.label ?? current?.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[140px] overflow-hidden">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  if (l.code !== lang) switchLanguage(l.code);
                  setOpen(false);
                }}
                className={`block w-full text-start px-4 py-2.5 text-sm transition-colors ${
                  l.code === lang
                    ? "text-[var(--accent)] bg-[var(--accent)]/10 cursor-default"
                    : "text-[var(--foreground)] hover:bg-[var(--accent)]/10"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
