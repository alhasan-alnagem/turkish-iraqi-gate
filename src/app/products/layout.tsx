import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description:
    "We source anything available in Turkey: medical equipment, construction materials, food, electronics, automotive parts, furniture, textiles, and industrial machinery.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    url: "https://www.tigip.com/products",
    title: "Products We Source from Turkey",
    description:
      "Medical equipment, construction materials, food, electronics, and more sourced from Turkey and delivered to Iraq.",
    images: [
      {
        url: "https://www.tigip.com/og.png",
        width: 1200,
        height: 630,
        alt: "Turkish Iraqi Gate For Importing And Procurement",
      },
    ],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
