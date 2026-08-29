import type { Metadata } from "next";

type Lang = "en" | "ar" | "tr";

const BASE = "https://www.tigip.com";

type MetaDef = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

const routeMeta: Record<string, Record<Lang, MetaDef>> = {
  home: {
    en: {
      title: "Turkish Iraqi Gate | Import from Turkey to Iraq",
      description:
        "We find products, check prices, negotiate discounts, and arrange shipping from Turkey to Iraq. Your trusted import partner since 2020.",
      ogTitle: "Turkish Iraqi Gate For Importing And Procurement",
      ogDescription:
        "We find products, check prices, negotiate discounts, and arrange shipping from Turkey to Iraq.",
    },
    ar: {
      title: "بوابة تركيا العراقية للاستيراد والتجهيز | استيراد من تركيا إلى العراق",
      description:
        "نجد المنتجات، نتحقق من الأسعار، نتفاوض على الخصومات، ونرتب الشحن من تركيا إلى العراق. شريكك الموثوق للاستيراد منذ 2020.",
      ogTitle: "بوابة تركيا العراقية للاستيراد والتجهيز",
      ogDescription:
        "نجد المنتجات، نتحقق من الأسعار، نتفاوض على الخصومات، ونرتب الشحن من تركيا إلى العراق.",
    },
    tr: {
      title: "Türkiye Irak Kapısı | Türkiye'den Irak'a İthalat",
      description:
        "Ürünleri bulur, fiyatları kontrol eder, indirimler müzakere eder ve Türkiye'den Irak'a nakliye düzenleriz. 2020'den beri güvenilir ithalat ortağınız.",
      ogTitle: "Türkiye Irak Kapısı İthalat ve Tedarik",
      ogDescription:
        "Ürünleri bulur, fiyatları kontrol eder, indirimler müzakere eder ve Türkiye'den Irak'a nakliye düzenleriz.",
    },
  },
  about: {
    en: {
      title: "About Us",
      description:
        "Turkish Iraqi Gate helps Iraqi businesses source, import, and buy any product from Turkey since 2020.",
      ogTitle: "About Us | Turkish Iraqi Gate",
      ogDescription:
        "Turkish Iraqi Gate helps Iraqi businesses source, import, and buy any product from Turkey.",
    },
    ar: {
      title: "من نحن",
      description:
        "بوابة تركيا العراقية تساعد الشركات العراقية على التوريد والاستيراد وشراء أي منتج من تركيا منذ 2020.",
      ogTitle: "من نحن | بوابة تركيا العراقية",
      ogDescription:
        "بوابة تركيا العراقية تساعد الشركات العراقية على التوريد والاستيراد وشراء أي منتج من تركيا.",
    },
    tr: {
      title: "Hakkımızda",
      description:
        "Türkiye Irak Kapısı, 2020'den beri Iraklı işletmelerin Türkiye'den herhangi bir ürünü tedarik etmesine, ithal etmesine ve satın almasına yardımcı olur.",
      ogTitle: "Hakkımızda | Türkiye Irak Kapısı",
      ogDescription:
        "Türkiye Irak Kapısı, Iraklı işletmelerin Türkiye'den herhangi bir ürünü tedarik etmesine, ithal etmesine ve satın almasına yardımcı olur.",
    },
  },
  services: {
    en: {
      title: "Services",
      description:
        "Full-service import from Turkey: product sourcing, price negotiation, quality inspection, logistics, customs clearance, and door-to-door delivery to Iraq.",
      ogTitle: "Import Services from Turkey to Iraq",
      ogDescription:
        "Full-service import from Turkey: sourcing, negotiation, inspection, logistics, and door-to-door delivery to Iraq.",
    },
    ar: {
      title: "خدماتنا",
      description:
        "استيراد شامل من تركيا: توريد المنتجات، التفاوض على الأسعار، فحص الجودة، الخدمات اللوجستية، التخليص الجمركي، والتوصيل إلى باب المنزل في العراق.",
      ogTitle: "خدمات الاستيراد من تركيا إلى العراق",
      ogDescription:
        "استيراد شامل من تركيا: التوريد، التفاوض، الفحص، الخدمات اللوجستية، والتوصيل إلى باب المنزل في العراق.",
    },
    tr: {
      title: "Hizmetler",
      description:
        "Türkiye'den uçtan uca ithalat: ürün tedariki, fiyat müzakeresi, kalite kontrolü, lojistik, gümrük işlemleri ve Irak'a kapıdan kapıya teslimat.",
      ogTitle: "Türkiye'den Irak'a İthalat Hizmetleri",
      ogDescription:
        "Türkiye'den uçtan uca ithalat: tedarik, müzakere, kontrol, lojistik ve Irak'a kapıdan kapıya teslimat.",
    },
  },
  products: {
    en: {
      title: "Products",
      description:
        "We source anything available in Turkey: medical equipment, construction materials, food, electronics, automotive parts, furniture, textiles, and industrial machinery.",
      ogTitle: "Products We Source from Turkey",
      ogDescription:
        "Medical equipment, construction materials, food, electronics, and more sourced from Turkey and delivered to Iraq.",
    },
    ar: {
      title: "المنتجات",
      description:
        "نوفر أي منتج متوفر في تركيا: المعدات الطبية، مواد البناء، المواد الغذائية، الإلكترونيات، قطع غيار السيارات، الأثاث، المنسوجات، والآلات الصناعية.",
      ogTitle: "المنتجات التي نوفرها من تركيا",
      ogDescription:
        "المعدات الطبية، مواد البناء، المواد الغذائية، الإلكترونيات، وغيرها من تركيا وتوصيلها إلى العراق.",
    },
    tr: {
      title: "Ürünler",
      description:
        "Türkiye'de bulunan her şeyi tedarik ediyoruz: tıbbi ekipman, inşaat malzemeleri, gıda, elektronik, otomotiv yedek parça, mobilya, tekstil ve endüstriyel makineler.",
      ogTitle: "Türkiye'den Tedarik Ettiğimiz Ürünler",
      ogDescription:
        "Tıbbi ekipman, inşaat malzemeleri, gıda, elektronik ve daha fazlası Türkiye'den tedarik edilir ve Irak'a teslim edilir.",
    },
  },
  catalogs: {
    en: {
      title: "Catalogs",
      description:
        "Browse Turkish Iraqi Gate product catalogs organized by category, or ask about a product we can source on request from Turkey.",
      ogTitle: "Product Catalogs | Turkish Iraqi Gate",
      ogDescription:
        "Browse product catalogs organized by category. Ask about any product sourced from Turkey.",
    },
    ar: {
      title: "الكتالوجات",
      description:
        "تصفح كتالوجات منتجات بوابة تركيا العراقية حسب الفئة، أو اسأل عن منتج يمكننا توفيره بناءً على طلبك من تركيا.",
      ogTitle: "كتالوجات المنتجات | بوابة تركيا العراقية",
      ogDescription:
        "تصفح كتالوجات المنتجات مرتبة حسب الفئة. اسأل عن أي منتج يتم توفيره من تركيا.",
    },
    tr: {
      title: "Kataloglar",
      description:
        "Türkiye Irak Kapısı ürün kataloglarına kategoriye göre göz atın veya sipariş üzerine tedarik edebileceğimiz bir ürün hakkında soru sorun.",
      ogTitle: "Ürün Katalogları | Türkiye Irak Kapısı",
      ogDescription:
        "Kategoriye göre düzenlenmiş ürün kataloglarına göz atın. Türkiye'den tedarik edilen herhangi bir ürün hakkında soru sorun.",
    },
  },
  contact: {
    en: {
      title: "Contact Us",
      description:
        "Contact Turkish Iraqi Gate to request a quote, source products from Turkey, or get a free consultation for shipping to Iraq.",
      ogTitle: "Contact Us | Turkish Iraqi Gate",
      ogDescription:
        "Request a quote or source products from Turkey. Contact Turkish Iraqi Gate for free consultation and shipping to Iraq.",
    },
    ar: {
      title: "اتصل بنا",
      description:
        "اتصل ببوابة تركيا العراقية لطلب عرض سعر، أو توريد منتجات من تركيا، أو الحصول على استشارة مجانية للشحن إلى العراق.",
      ogTitle: "اتصل بنا | بوابة تركيا العراقية",
      ogDescription:
        "اطلب عرض سعر أو قم بتوريد منتجات من تركيا. اتصل ببوابة تركيا العراقية للحصول على استشارة مجانية والشحن إلى العراق.",
    },
    tr: {
      title: "İletişim",
      description:
        "Türkiye Irak Kapısı ile iletişime geçerek fiyat teklifi isteyin, Türkiye'den ürün tedarik edin veya Irak'a nakliye için ücretsiz danışmanlık alın.",
      ogTitle: "İletişim | Türkiye Irak Kapısı",
      ogDescription:
        "Fiyat teklifi isteyin veya Türkiye'den ürün tedarik edin. Ücretsiz danışmanlık ve Irak'a nakliye için Türkiye Irak Kapısı ile iletişime geçin.",
    },
  },
};

export function getLocalizedMeta(lang: Lang, route: keyof typeof routeMeta): Metadata {
  const meta = routeMeta[route][lang];
  const canonical = route === "home" ? `/${lang}` : `/${lang}/${route}`;
  const isAr = lang === "ar";
  const isTr = lang === "tr";

  return {
    metadataBase: new URL(BASE),
    title: {
      default: meta.title,
      template: `%s | ${isAr ? "بوابة تركيا العراقية" : isTr ? "Türkiye Irak Kapısı" : "Turkish Iraqi Gate"}`,
    },
    description: meta.description,
    alternates: {
      canonical,
      languages: {
        en: `/en${route === "home" ? "" : `/${route}`}`,
        ar: `/ar${route === "home" ? "" : `/${route}`}`,
        tr: `/tr${route === "home" ? "" : `/${route}`}`,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: `${BASE}/en${route === "home" ? "" : `/${route}`}`,
      siteName: isAr ? "بوابة تركيا العراقية للاستيراد والتجهيز" : isTr ? "Türkiye Irak Kapısı İthalat ve Tedarik" : "Turkish Iraqi Gate For Importing And Procurement",
      title: meta.ogTitle,
      description: meta.ogDescription,
      locale: isAr ? "ar_IQ" : isTr ? "tr_TR" : "en_US",
      images: [
        {
          url: `${BASE}/og.png`,
          width: 1200,
          height: 630,
          alt: isAr ? "بوابة تركيا العراقية للاستيراد والتجهيز" : isTr ? "Türkiye Irak Kapısı İthalat ve Tedarik" : "Turkish Iraqi Gate For Importing And Procurement",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: [`${BASE}/og.png`],
    },
  };
}

export function toLang(lang: string): Lang {
  if (lang === "ar") return "ar";
  if (lang === "tr") return "tr";
  return "en";
}
