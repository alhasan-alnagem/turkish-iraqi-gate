"use client";

import { useLanguage } from "@/lib/LanguageProvider";

const logoMap: Record<string, { src: string; alt: string }> = {
  en: { src: "/logo.svg", alt: "Turkish Iraqi Gate For Importing And Procurement" },
  ar: { src: "/logo-rtl.svg", alt: "بوابة تركيا العراقية للاستيراد والتجهيز" },
  tr: { src: "/logo-tr.svg", alt: "Türkiye Irak Kapısı İthalat ve Tedarik" },
};

export default function Logo({ className }: { className?: string }) {
  const { lang } = useLanguage();
  const logo = logoMap[lang] ?? logoMap.en;
  return <img src={logo.src} alt={logo.alt} className={className} />;
}
