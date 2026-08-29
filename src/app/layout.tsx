import type { Metadata } from "next";
import { Geist, Geist_Mono, Tajawal } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageProvider";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const arabicFont = Tajawal({
  variable: "--font-arabic",
  weight: ["400", "500", "700"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tigip.com"),
  title: {
    default: "Turkish Iraqi Gate | Import from Turkey to Iraq",
    template: "%s | Turkish Iraqi Gate",
  },
  description:
    "We find products, check prices, negotiate discounts, and arrange shipping from Turkey to Iraq. Your trusted import partner since 2020.",
  keywords: [
    "import from Turkey to Iraq",
    "Turkey Iraq trade",
    "Turkish import services",
    "product sourcing Turkey",
    "Iraq import company",
    "shipping Turkey to Iraq",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://www.tigip.com/",
    siteName: "Turkish Iraqi Gate For Importing And Procurement",
    title: "Turkish Iraqi Gate For Importing And Procurement | Import from Turkey to Iraq",
    description:
      "We find products, check prices, negotiate discounts, and arrange shipping from Turkey to Iraq. Your trusted import partner since 2020.",
    locale: "en_US",
    images: [
      {
        url: "https://www.tigip.com/og.png",
        width: 1200,
        height: 630,
        alt: "Turkish Iraqi Gate For Importing And Procurement",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turkish Iraqi Gate For Importing And Procurement",
    description:
      "We find products, check prices, negotiate discounts, and arrange shipping from Turkey to Iraq.",
    images: ["https://www.tigip.com/og.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} ${arabicFont.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Turkish Iraqi Gate For Importing And Procurement",
              url: "https://www.tigip.com/",
              description:
                "We find products, check prices, negotiate discounts, and arrange shipping from Turkey to Iraq.",
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  telephone: "+9647866417123",
                  contactType: "customer service",
                },
                {
                  "@type": "ContactPoint",
                  telephone: "+9647807020498",
                  contactType: "customer service",
                },
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var lang = localStorage.getItem('lang');
                if (lang === 'ar') { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <LanguageProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
