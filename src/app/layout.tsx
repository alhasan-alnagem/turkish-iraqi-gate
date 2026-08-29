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
