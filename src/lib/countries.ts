/**
 * Dialling codes used by the order forms and by the `wa.me` links.
 *
 * Iraq comes first and is the default: most orders are Iraqi, and the phone
 * field keeps its familiar 0780… shape. The list is deliberately short — the
 * destinations TIGIP actually ships to — because a 200-entry dropdown is worse
 * than typing the code by hand for the rare case.
 *
 * `iso` lets the public form print the country in the visitor's own language
 * via `Intl.DisplayNames` instead of adding 48 translation strings.
 */
export type Country = { code: string; iso: string; name: string };

export const ORDER_COUNTRIES: readonly Country[] = [
  { code: "964", iso: "IQ", name: "Iraq" },
  { code: "90", iso: "TR", name: "Türkiye" },
  { code: "963", iso: "SY", name: "Syria" },
  { code: "98", iso: "IR", name: "Iran" },
  { code: "962", iso: "JO", name: "Jordan" },
  { code: "965", iso: "KW", name: "Kuwait" },
  { code: "966", iso: "SA", name: "Saudi Arabia" },
  { code: "971", iso: "AE", name: "United Arab Emirates" },
  { code: "974", iso: "QA", name: "Qatar" },
  { code: "973", iso: "BH", name: "Bahrain" },
  { code: "968", iso: "OM", name: "Oman" },
  { code: "961", iso: "LB", name: "Lebanon" },
  { code: "20", iso: "EG", name: "Egypt" },
  { code: "49", iso: "DE", name: "Germany" },
  { code: "44", iso: "GB", name: "United Kingdom" },
  { code: "1", iso: "US", name: "United States / Canada" },
];

export const DEFAULT_COUNTRY_CODE = "964";

const CODES = new Set(ORDER_COUNTRIES.map((country) => country.code));

/** Accepts "964", "+964", "00964" and returns a code from the list, or the default. */
export function normaliseCountryCode(value: string | null | undefined): string {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^00/, "");
  return CODES.has(digits) ? digits : DEFAULT_COUNTRY_CODE;
}

/**
 * Reads the country from a number that was typed in international form
 * ("+90 501…", "00964 780…"). Local numbers fall back to Iraq, which is what
 * every pre-existing sheet row is.
 */
export function guessCountryCode(phone: string): string {
  const raw = phone.trim();
  if (!raw.startsWith("+") && !raw.startsWith("00")) return DEFAULT_COUNTRY_CODE;

  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  const match = [...ORDER_COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((country) => digits.startsWith(country.code));

  return match?.code ?? DEFAULT_COUNTRY_CODE;
}

/** Country name in a given language, with the English name as a fallback. */
export function countryName(country: Country, lang: string): string {
  try {
    const names = new Intl.DisplayNames([lang], { type: "region" });
    return names.of(country.iso) ?? country.name;
  } catch {
    return country.name;
  }
}
