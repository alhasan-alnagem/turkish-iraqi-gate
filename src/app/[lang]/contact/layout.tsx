import type { Metadata } from "next";
import { getLocalizedMeta, toLang, getBreadcrumbSchema } from "@/lib/seo";

type LangParams = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LangParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  return getLocalizedMeta(toLang(lang), "contact");
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LangParams>;
}) {
  const { lang } = await params;
  const l = toLang(lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getBreadcrumbSchema(l, "contact")) }}
      />
      {children}
    </>
  );
}
