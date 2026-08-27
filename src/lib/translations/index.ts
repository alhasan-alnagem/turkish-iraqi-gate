import en from "./en";
import ar from "./ar";
import type { Translations } from "./types";

export type Language = "en" | "ar";

export const languages: { code: Language; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

const translations: Record<Language, Translations> = { en, ar };

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export type { Translations };
