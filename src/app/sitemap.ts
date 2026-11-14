import type { MetadataRoute } from "next";

const BASE_URL = "https://www.tigip.com";
const LOCALES = ["en", "ar", "tr"] as const;
type Locale = (typeof LOCALES)[number];

type SitemapEntry = MetadataRoute.Sitemap[number];

type Route = {
  /** Path after the language segment; `""` is the home page. */
  path: string;
  changeFrequency: NonNullable<SitemapEntry["changeFrequency"]>;
  priority: number;
};

/**
 * Every public page, in the order the sitemap lists them. Keep this in sync
 * with the folders under `src/app/[lang]` — a new page that is not here is
 * invisible to Google until something else links to it.
 */
const ROUTES: Route[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "products", changeFrequency: "weekly", priority: 0.9 },
  { path: "catalogs", changeFrequency: "weekly", priority: 0.8 },
  { path: "services", changeFrequency: "monthly", priority: 0.8 },
  { path: "contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "about", changeFrequency: "monthly", priority: 0.7 },
  { path: "career", changeFrequency: "weekly", priority: 0.6 },
  { path: "track", changeFrequency: "monthly", priority: 0.6 },
  { path: "submit-catalog", changeFrequency: "monthly", priority: 0.5 },
];

function urlFor(locale: Locale, path: string): string {
  return path ? `${BASE_URL}/${locale}/${path}` : `${BASE_URL}/${locale}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.flatMap((route) =>
    LOCALES.map((locale) => ({
      url: urlFor(locale, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      // Tells Google the three URLs are the same page in different languages,
      // matching the hreflang tags the pages already emit.
      alternates: {
        languages: Object.fromEntries([
          ...LOCALES.map((other) => [other, urlFor(other, route.path)]),
          ["x-default", urlFor("en", route.path)],
        ]),
      },
    })),
  );
}
