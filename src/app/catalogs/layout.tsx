import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogs",
  description:
    "Browse Turkish Iraqi Gate product catalogs organized by category, or ask about a product we can source on request from Turkey.",
  alternates: {
    canonical: "/catalogs",
  },
  openGraph: {
    url: "https://www.tigip.com/catalogs",
    title: "Product Catalogs | Turkish Iraqi Gate",
    description:
      "Browse product catalogs organized by category. Catalogs coming soon — ask about any product sourced from Turkey.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
