import en from "./en";
import ar from "./ar";
import tr from "./tr";
import type { Translations } from "./types";

export type Language = "en" | "ar" | "tr";

export const languages: { code: Language; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
];

const translations: Record<Language, Translations> = { en, ar, tr };

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export type { Translations };
