import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Turkish Iraqi Gate For Importing And Procurement to request a quote, source products from Turkey, or get a free consultation for shipping to Iraq.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    url: "https://www.tigip.com/contact",
    title: "Contact Us | Turkish Iraqi Gate",
    description:
      "Request a quote or source products from Turkey. Contact Turkish Iraqi Gate for free consultation and shipping to Iraq.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
