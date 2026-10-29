import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "TIGIP — Catalog Manager",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Root layout for the private admin area. It sits outside the `[lang]` tree on
 * purpose: the panel is a single-language tool, never indexed, and must not
 * inherit the public site's marketing shell.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[var(--section)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
