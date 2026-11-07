/**
 * Reply languages shared by the server mail module and the portal's client
 * components (the decision dialog). Kept free of `server-only` so a browser
 * component can render the tick list without pulling in the mail transport.
 */

export type ReplyLanguage = "en" | "ar" | "tr";

export const REPLY_LANGUAGES: readonly ReplyLanguage[] = ["en", "ar", "tr"];

export const REPLY_LANGUAGE_LABELS: Record<ReplyLanguage, string> = {
  en: "English",
  ar: "العربية",
  tr: "Türkçe",
};

export function isReplyLanguage(value: string): value is ReplyLanguage {
  return (REPLY_LANGUAGES as readonly string[]).includes(value);
}

export function parseReplyLanguages(values: string[]): ReplyLanguage[] {
  const picked = values
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ReplyLanguage => isReplyLanguage(value));
  return Array.from(new Set(picked));
}
