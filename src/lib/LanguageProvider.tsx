"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  useState,
} from "react";
import { getTranslations, languages, type Language } from "@/lib/translations";
import type { Translations } from "@/lib/translations/types";

type LangContext = {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
  dir: "ltr" | "rtl";
  hasChosen: boolean;
};

const Context = createContext<LangContext | null>(null);

const STORAGE_KEY = "lang";

function getSnapshot(): Language | null {
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  return stored && languages.some((l) => l.code === stored) ? stored : null;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const storedLang = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const [lang, setLang] = useState<Language>(storedLang ?? "en");
  const [hasChosen, setHasChosen] = useState<boolean>(() => storedLang !== null);

  const changeLang = (next: Language) => {
    setLang(next);
    setHasChosen(true);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const dir = languages.find((l) => l.code === lang)?.dir || "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const t = getTranslations(lang);

  return (
    <Context value={{ lang, t, setLang: changeLang, dir, hasChosen }}>
      {children}
    </Context>
  );
}

export function useLanguage() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
