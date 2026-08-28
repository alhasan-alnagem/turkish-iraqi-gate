"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export function SiteHeader() {
  const { t, dir } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/services", label: t.nav.services },
    { href: "/products", label: t.nav.products },
    { href: "/catalogs", label: t.nav.catalogs },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--primary)] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-2 h-20 md:h-24">
          <Link href="/" className="flex items-center shrink-0 mr-2 md:mr-4">
            <Logo className="h-12 md:h-18 w-auto" rtl={dir === "rtl"} />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <LanguageSwitcher />
            <Link
              href="/contact"
              className="hidden lg:inline-flex bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {t.nav.getQuote}
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              className="md:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10 shrink-0 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
            >
              <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block w-5 h-0.5 bg-white transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </button>
          </div>
        </nav>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[var(--primary)] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-base font-medium text-white/80 hover:text-[var(--accent-light)] transition-colors border-b border-white/10 last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="mt-3 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-4 py-3 rounded-lg text-center font-semibold transition-colors"
            >
              {t.nav.getQuote}
            </Link>
          </div>
        </div>
      )}
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
