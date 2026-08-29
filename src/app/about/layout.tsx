import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Turkish Iraqi Gate For Importing And Procurement helps Iraqi businesses source, import, and buy any product from Turkey since 2020.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    url: "https://www.tigip.com/about",
    title: "About Us | Turkish Iraqi Gate",
    description:
      "Turkish Iraqi Gate For Importing And Procurement helps Iraqi businesses source, import, and buy any product from Turkey.",
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
