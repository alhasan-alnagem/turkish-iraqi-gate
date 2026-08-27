"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export function SiteHeader() {
  const { t, dir } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-[var(--primary)] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-24">
          <Link href="/" className="flex items-center shrink-0 mr-4">
            <Logo className="h-18 w-auto" rtl={dir === "rtl"} />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
            >
              {t.nav.home}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
            >
              {t.nav.about}
            </Link>
            <Link
              href="/services"
              className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
            >
              {t.nav.services}
            </Link>
            <Link
              href="/products"
              className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
            >
              {t.nav.products}
            </Link>
            <Link
              href="/catalogs"
              className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
            >
              {t.nav.catalogs}
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
            >
              {t.nav.contact}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/contact"
              className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {t.nav.getQuote}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t, dir } = useLanguage();

  return (
    <footer className="bg-[var(--primary)] text-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Logo className="h-18 w-auto mb-3" rtl={dir === "rtl"} />
            <p className="text-sm leading-relaxed">{t.footer.tagline}</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">{t.footer.quickLinks}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-[var(--accent-light)] transition-colors">{t.nav.home}</Link></li>
              <li><Link href="/about" className="hover:text-[var(--accent-light)] transition-colors">{t.nav.about}</Link></li>
              <li><Link href="/services" className="hover:text-[var(--accent-light)] transition-colors">{t.nav.services}</Link></li>
              <li><Link href="/products" className="hover:text-[var(--accent-light)] transition-colors">{t.nav.products}</Link></li>
              <li><Link href="/catalogs" className="hover:text-[var(--accent-light)] transition-colors">{t.nav.catalogs}</Link></li>
              <li><Link href="/contact" className="hover:text-[var(--accent-light)] transition-colors">{t.nav.contact}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">{t.footer.services}</h4>
            <ul className="space-y-2 text-sm">
              <li>Product Sourcing</li>
              <li>Price Negotiation</li>
              <li>Logistics & Shipping</li>
              <li>Customs Clearance</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">{t.footer.contact}</h4>
            <ul className="space-y-2 text-sm">
              <li>Istanbul, Turkey</li>
              <li>Baghdad, Iraq</li>
              <li>info@turkishiraqgate.com</li>
              <li>+90 212 555 0123</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm">
          &copy; {new Date().getFullYear()} Turkish Iraq Gate. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
