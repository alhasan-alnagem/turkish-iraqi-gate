import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_ROUTES = ["about", "services", "products", "catalogs", "contact"];

const SUPPORTED = ["ar", "tr", "en"] as const;

function detectLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language") ?? "";
  const langs = header
    .split(",")
    .map((part) => {
      const [tag] = part.split(";");
      return tag.trim().toLowerCase();
    })
    .filter(Boolean)
    .map((tag) => tag.split("-")[0]);

  for (const lang of langs) {
    if ((SUPPORTED as readonly string[]).includes(lang)) {
      return lang;
    }
  }
  return "en";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy English URLs redirect to their /en/... equivalents (preserve old links + SEO).
  for (const route of LEGACY_ROUTES) {
    if (pathname === `/${route}`) {
      const url = request.nextUrl.clone();
      url.pathname = `/en/${route}`;
      return NextResponse.redirect(url, 308);
    }
  }

  // Root redirects to the visitor's preferred locale (Arabic, then Turkish, else English).
  if (pathname === "/") {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/about", "/services", "/products", "/catalogs", "/contact"],
};
