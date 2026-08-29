import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Full-service import from Turkey: product sourcing, price negotiation, quality inspection, logistics, customs clearance, and door-to-door delivery to Iraq.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    url: "https://www.tigip.com/services",
    title: "Import Services from Turkey to Iraq",
    description:
      "Full-service import from Turkey: sourcing, negotiation, inspection, logistics, and door-to-door delivery to Iraq.",
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
