import { languages } from "@/lib/translations";
import { getLocalizedMeta, toLang } from "@/lib/seo";

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

export default function LangLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
