import { Geist, Geist_Mono, Tajawal } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../globals.css";
import { LanguageProvider } from "@/lib/LanguageProvider";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { languages } from "@/lib/translations";
import { getLocalizedMeta, toLang, getOrganizationSchema } from "@/lib/seo";

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

export function generateStaticParams() {
  return languages.map((l) => ({ lang: l.code }));
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

type LangParams = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LangParams>;
}): Promise<import("next").Metadata> {
  const { lang } = await params;
  return getLocalizedMeta(toLang(lang), "home");
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LangParams>;
}) {
  const { lang } = await params;
  const l = toLang(lang);
  const dir = languages.find((x) => x.code === l)?.dir || "ltr";

  return (
    <html
      lang={l}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${arabicFont.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        <LanguageProvider>
          <SiteHeader />
          <main className="flex-1">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationSchema(l)) }}
            />
            {children}
          </main>
          <SiteFooter />
        </LanguageProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
