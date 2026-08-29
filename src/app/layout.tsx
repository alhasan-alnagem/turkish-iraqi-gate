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
