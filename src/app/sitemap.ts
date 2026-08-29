import type { MetadataRoute } from "next";

const BASE_URL = "https://www.tigip.com";
const LOCALES = ["en", "ar"] as const;
const ROUTES = ["about", "services", "products", "catalogs", "contact"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const lang of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${lang}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    });
    for (const route of ROUTES) {
      entries.push({
        url: `${BASE_URL}/${lang}/${route}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: route === "catalogs" ? 0.6 : 0.8,
      });
    }
  }

  return entries;
}
