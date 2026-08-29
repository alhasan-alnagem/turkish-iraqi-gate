import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_ROUTES = ["about", "services", "products", "catalogs", "contact"];

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

  // Root redirects to default English locale.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/en";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/about", "/services", "/products", "/catalogs", "/contact"],
};
