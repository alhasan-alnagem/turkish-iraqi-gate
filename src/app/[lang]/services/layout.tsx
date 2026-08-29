import type { Metadata } from "next";
import { getLocalizedMeta, toLang } from "@/lib/seo";

type LangParams = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LangParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  return getLocalizedMeta(toLang(lang), "services");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
