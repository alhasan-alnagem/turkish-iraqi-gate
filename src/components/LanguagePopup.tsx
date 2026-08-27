"use client";

import { useLanguage } from "@/lib/LanguageProvider";
import { languages } from "@/lib/translations";

export default function LanguagePopup() {
  const { hasChosen, setLang } = useLanguage();

  if (hasChosen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl max-w-md w-full p-8 sm:p-10 text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h2 className="text-2xl font-bold text-[var(--primary)] mb-2">
          Choose your language
        </h2>
        <p className="text-[var(--muted)] mb-8">
          اختر لغتك المفضلة
        </p>
        <div className="grid grid-cols-2 gap-4">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                window.location.assign("/");
              }}
              className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white px-6 py-4 rounded-lg font-semibold transition-colors border-2 border-transparent hover:border-[var(--accent)]"
            >
              <span className="block text-lg">{l.label}</span>
              <span className="block text-xs text-white/70 mt-1">
                {l.code === "en" ? "English" : "العربية"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
