"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getTranslations, languages, type Language } from "@/lib/translations";
import type { Translations } from "@/lib/translations/types";

type LangContext = {
  lang: Language;
  t: Translations;
  dir: "ltr" | "rtl";
  switchLanguage: (next: Language) => void;
};

const Context = createContext<LangContext | null>(null);

function getLangFromPath(pathname: string): Language {
  const seg = pathname.split("/")[1] as Language | undefined;
  return seg && languages.some((l) => l.code === seg) ? seg : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const lang = getLangFromPath(pathname);
  const dir = languages.find((l) => l.code === lang)?.dir || "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const switchLanguage = (next: Language) => {
    const parts = pathname.split("/");
    if (parts[1] === "en" || parts[1] === "ar") {
      parts[1] = next;
    } else {
      parts.unshift("", next);
    }
    router.push(parts.join("/") || "/");
  };

  const t = getTranslations(lang);

  return (
    <Context value={{ lang, t, dir, switchLanguage }}>
      {children}
    </Context>
  );
}

export function useLanguage() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
