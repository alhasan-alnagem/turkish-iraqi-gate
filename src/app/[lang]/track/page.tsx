import type { Metadata } from "next";
import TrackForm from "@/components/site/TrackForm";
import { getLocalizedMeta, toLang } from "@/lib/seo";

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  return getLocalizedMeta(toLang(lang), "track");
}

const COPY = {
  en: {
    tag: "Tracking",
    title: "Track your shipment",
    subtitle:
      "Enter your order number and the phone number you ordered with. You will see every stage from factory to your door.",
    refLabel: "Order number",
    refPlaceholder: "TIG-2026-0001",
    phoneLabel: "Phone number",
    phonePlaceholder: "0780 000 0000",
    submit: "Track",
    checking: "Checking…",
    notFound: "No order matches that number and phone.",
    status: "Status",
    history: "History",
    progress: "Progress",
    updated: "Last update",
    help: "Your order number is on the confirmation you received from us.",
  },
  ar: {
    tag: "تتبّع الشحنة",
    title: "تتبّع شحنتك",
    subtitle:
      "أدخل رقم طلبك ورقم الهاتف الذي طلبت به، وسترى كل مرحلة من المصنع حتى بابك.",
    refLabel: "رقم الطلب",
    refPlaceholder: "TIG-2026-0001",
    phoneLabel: "رقم الهاتف",
    phonePlaceholder: "0780 000 0000",
    submit: "تتبّع",
    checking: "جارٍ التحقق…",
    notFound: "لا يوجد طلب مطابق لهذا الرقم.",
    status: "الحالة",
    history: "سجل الحالات",
    progress: "التقدّم",
    updated: "آخر تحديث",
    help: "رقم الطلب موجود في رسالة التأكيد التي أرسلناها لك.",
  },
  tr: {
    tag: "Takip",
    title: "Gönderinizi takip edin",
    subtitle:
      "Sipariş numaranızı ve sipariş verirken kullandığınız telefon numarasını girin. Fabrikadan kapınıza kadar her aşamayı görün.",
    refLabel: "Sipariş numarası",
    refPlaceholder: "TIG-2026-0001",
    phoneLabel: "Telefon numarası",
    phonePlaceholder: "0780 000 0000",
    submit: "Takip et",
    checking: "Kontrol ediliyor…",
    notFound: "Bu numarayla eşleşen sipariş bulunamadı.",
    status: "Durum",
    history: "Durum geçmişi",
    progress: "İlerleme",
    updated: "Son güncelleme",
    help: "Sipariş numaranız size gönderdiğimiz onay mesajında yer alır.",
  },
} as const;

export default async function TrackPage({ params }: { params: Promise<Params> }) {
  const { lang: langParam } = await params;
  const lang = toLang(langParam);
  const copy = COPY[lang];

  return (
    <>
      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {copy.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{copy.title}</h1>
            <p className="text-lg text-white/70 leading-relaxed">{copy.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <TrackForm copy={copy} lang={lang} />
          <p className="mt-6 text-center text-sm text-[var(--muted)]">{copy.help}</p>
        </div>
      </section>
    </>
  );
}
