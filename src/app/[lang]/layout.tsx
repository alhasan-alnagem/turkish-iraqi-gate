import { languages } from "@/lib/translations";
import { getLocalizedMeta, toLang, getOrganizationSchema } from "@/lib/seo";

export function generateStaticParams() {
  return languages.map((l) => ({ lang: l.code }));
}

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationSchema(l)) }}
      />
      {children}
    </>
  );
}
