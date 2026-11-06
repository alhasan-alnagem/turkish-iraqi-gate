import "server-only";

/**
 * Automatic replies to job applicants.
 *
 * An administrator decides an application (hire / decline) or books an
 * interview, ticks the language(s) to answer in, and this module writes and
 * sends the message. The same sender and reply address as the public career
 * form are used, so the applicant sees one consistent conversation.
 *
 * Sending is best effort: the decision is already stored, so a missing
 * RESEND_API_KEY or a mail outage never blocks the workflow. The caller shows
 * what actually happened.
 */

export type ReplyLanguage = "en" | "ar" | "tr";

export const REPLY_LANGUAGES: readonly ReplyLanguage[] = ["en", "ar", "tr"];

export const REPLY_LANGUAGE_LABELS: Record<ReplyLanguage, string> = {
  en: "English",
  ar: "العربية",
  tr: "Türkçe",
};

export function isReplyLanguage(value: string): value is ReplyLanguage {
  return (REPLY_LANGUAGES as readonly string[]).includes(value);
}

export function parseReplyLanguages(values: string[]): ReplyLanguage[] {
  const picked = values
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ReplyLanguage => isReplyLanguage(value));
  return Array.from(new Set(picked));
}

export type DecisionKind = "hired" | "rejected" | "interview";

export const DECISION_LABELS: Record<DecisionKind, string> = {
  hired: "Approved / hired",
  rejected: "Declined",
  interview: "Interview invitation",
};

/** The office runs on Baghdad time (UTC+3, no daylight saving). */
export const OFFICE_TZ = "Asia/Baghdad";
export const OFFICE_OFFSET = "+03";

/** `datetime-local` value (2026-11-10T14:30) → a timestamptz input in office time. */
export function interviewStamp(local: string): string {
  const clean = local.trim().replace(" ", "T").slice(0, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) return "";
  return `${clean.replace("T", " ")} ${OFFICE_OFFSET}`;
}

export function formatInterview(stamp: string | Date | null): string {
  if (!stamp) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OFFICE_TZ,
  }).format(new Date(stamp));
}

export type InterviewDetails = {
  at: string;
  mode: string;
  note: string;
};

export type ReplyInput = {
  to: string;
  name: string;
  position: string;
  kind: DecisionKind;
  langs: ReplyLanguage[];
  /** Internal note from the reviewer, included as a personal line. */
  note?: string;
  interview?: InterviewDetails | null;
};

export type ReplyResult = {
  sent: ReplyLanguage[];
  skipped: boolean;
  failed: ReplyLanguage[];
};

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL =
  process.env.CAREER_FROM_EMAIL ||
  "Careers at Turkish Iraqi Gate <onboarding@resend.dev>";
const REPLY_TO = process.env.CAREER_REPLY_TO || "alhasan.alnagem@tigip.com";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Copy = {
  dir: "ltr" | "rtl";
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  lead: (position: string) => string;
  body: string;
  interviewLead?: string;
  signature: string;
  company: string;
};

const COPY: Record<ReplyLanguage, Copy> = {
  en: {
    dir: "ltr",
    subject: "Your application — Turkish Iraqi Gate",
    heading: "Your application",
    greeting: (name) => `Dear ${name},`,
    lead: (position) => `Thank you for applying for <strong>${esc(position)}</strong> at Turkish Iraqi Gate.`,
    body: "",
    signature: "Kind regards,",
    company: "Careers · Turkish Iraqi Gate For Importing And Procurement",
  },
  ar: {
    dir: "rtl",
    subject: "طلب التوظيف — بوابة تركيا العراقية",
    heading: "بخصوص طلبك",
    greeting: (name) => `عزيزنا ${name}،`,
    lead: (position) => `نشكرك على تقدّمك لوظيفة <strong>${esc(position)}</strong> في بوابة تركيا العراقية للاستيراد والتجهيز.`,
    body: "",
    signature: "مع التقدير،",
    company: "قسم التوظيف · بوابة تركيا العراقية للاستيراد والتجهيز",
  },
  tr: {
    dir: "ltr",
    subject: "Başvurunuz — Turkish Iraqi Gate",
    heading: "Başvurunuz hakkında",
    greeting: (name) => `Sayın ${name},`,
    lead: (position) => `Turkish Iraqi Gate bünyesindeki <strong>${esc(position)}</strong> pozisyonuna başvurunuz için teşekkür ederiz.`,
    body: "",
    signature: "Saygılarımızla,",
    company: "İnsan Kaynakları · Turkish Iraqi Gate For Importing And Procurement",
  },
};

const MESSAGE: Record<ReplyLanguage, Record<DecisionKind, (position: string) => string>> = {
  en: {
    hired: (position) =>
      `We are pleased to tell you that your application has been <strong>approved</strong>. We would like to welcome you to the team as <strong>${esc(position)}</strong>. A member of the team will contact you shortly with your start date and the documents we need.`,
    rejected: (position) =>
      `After careful review, we have decided <strong>not to move forward</strong> with your application for <strong>${esc(position)}</strong> at this time. This was not an easy decision, and we will keep your CV on file should a suitable role open up. We wish you every success.`,
    interview: (position) =>
      `We would like to invite you to an <strong>interview</strong> for the <strong>${esc(position)}</strong> position. The details are below — please reply to this email to confirm the time.`,
  },
  ar: {
    hired: (position) =>
      `يسرّنا إبلاغك بأنه تمت <strong>الموافقة</strong> على طلبك، ونرحّب بك في فريقنا بوظيفة <strong>${esc(position)}</strong>. سيتواصل معك أحد أعضاء الفريق قريباً لتحديد تاريخ المباشرة والمستندات المطلوبة.`,
    rejected: (position) =>
      `بعد دراسة دقيقة، قرّرنا <strong>عدم المضي قدماً</strong> في طلبك لوظيفة <strong>${esc(position)}</strong> في الوقت الحالي. لم يكن هذا القرار سهلاً، وسنحتفظ بسيرتك الذاتية في حال توفّر وظيفة مناسبة. نتمنى لك التوفيق.`,
    interview: (position) =>
      `يسرّنا دعوتك إلى <strong>مقابلة</strong> لوظيفة <strong>${esc(position)}</strong>. التفاصيل أدناه — يرجى الرد على هذه الرسالة لتأكيد الموعد.`,
  },
  tr: {
    hired: (position) =>
      `Başvurunuzun <strong>onaylandığını</strong> memnuniyetle bildiririz. <strong>${esc(position)}</strong> pozisyonunda sizi ekibimize katılmaya davet ediyoruz. Başlangıç tarihi ve gerekli belgeler için kısa süre içinde sizinle iletişime geçeceğiz.`,
    rejected: (position) =>
      `Yaptığımız değerlendirme sonucunda <strong>${esc(position)}</strong> pozisyonu için başvurunuzla <strong>şu aşamada ilerlememe</strong> kararı aldık. Bu kolay bir karar değildi; uygun bir pozisyon açılması durumunda özgeçmişinizi dosyamızda tutacağız. Başarılar dileriz.`,
    interview: (position) =>
      `<strong>${esc(position)}</strong> pozisyonu için sizi <strong>mülakata</strong> davet etmek istiyoruz. Ayrıntılar aşağıda — saati teyit etmek için lütfen bu e-postayı yanıtlayın.`,
  },
};

const INTERVIEW_LABELS: Record<
  ReplyLanguage,
  { when: string; how: string; note: string; closing: string }
> = {
  en: { when: "Date and time", how: "Format", note: "Notes", closing: "The time shown is Baghdad time (GMT+3)." },
  ar: { when: "التاريخ والوقت", how: "طريقة المقابلة", note: "ملاحظات", closing: "الوقت المذكور بتوقيت بغداد (غرينتش +3)." },
  tr: { when: "Tarih ve saat", how: "Görüşme şekli", note: "Notlar", closing: "Belirtilen saat Bağdat saatidir (GMT+3)." },
};

function htmlFor(lang: ReplyLanguage, input: ReplyInput): string {
  const copy = COPY[lang];
  const intro = MESSAGE[lang][input.kind](input.position);
  const labels = INTERVIEW_LABELS[lang];

  const interviewBlock =
    input.kind === "interview" && input.interview
      ? `<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">
           <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:150px">${labels.when}</td>
               <td style="padding:8px 12px"><strong>${esc(formatInterview(input.interview.at))}</strong></td></tr>
           ${
             input.interview.mode
               ? `<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">${labels.how}</td>
                    <td style="padding:8px 12px">${esc(input.interview.mode)}</td></tr>`
               : ""
           }
           ${
             input.interview.note
               ? `<tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">${labels.note}</td>
                    <td style="padding:8px 12px">${esc(input.interview.note)}</td></tr>`
               : ""
           }
         </table>
         <p style="color:#6b7280;font-size:12px;margin-top:0">${labels.closing}</p>`
      : "";

  const personal = input.note
    ? `<p style="margin:16px 0;padding:12px 14px;background:#f0fdf4;border-${
        copy.dir === "rtl" ? "right" : "left"
      }:3px solid #16a34a;white-space:pre-wrap">${esc(input.note)}</p>`
    : "";

  return `<!doctype html>
  <html lang="${lang}" dir="${copy.dir}">
  <body style="margin:0;padding:24px 12px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;line-height:1.65;text-align:${
      copy.dir === "rtl" ? "right" : "left"
    }">
      <p style="margin:0 0 6px;color:#16a34a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Turkish Iraqi Gate</p>
      <h2 style="margin:0 0 16px;color:#0f5624;font-size:20px">${copy.heading}</h2>
      <p style="margin:0 0 12px">${copy.greeting(esc(input.name))}</p>
      <p style="margin:0 0 12px">${copy.lead(input.position)}</p>
      <p style="margin:0 0 12px">${intro}</p>
      ${interviewBlock}
      ${personal}
      <p style="margin:20px 0 0">${copy.signature}</p>
      <p style="margin:4px 0 0;color:#0f5624;font-weight:600">${copy.company}</p>
      <p style="margin:16px 0 0;border-top:1px solid #e5e7eb;padding-top:12px;color:#6b7280;font-size:12px">
        tigip.com
      </p>
    </div>
  </body>
  </html>`;
}

function subjectFor(lang: ReplyLanguage, input: ReplyInput): string {
  const base = COPY[lang].subject;
  const suffix = DECISION_LABELS[input.kind].toLowerCase();
  return `${base} — ${suffix}`;
}

/**
 * One email per ticked language, so the applicant is never sent a mixed-language
 * message. Returns which languages went out, and which failed.
 */
export async function sendApplicationReply(input: ReplyInput): Promise<ReplyResult> {
  const langs = Array.from(new Set(input.langs));
  const result: ReplyResult = { sent: [], skipped: false, failed: [] };

  if (langs.length === 0) return result;

  if (!RESEND_API_KEY) {
    result.skipped = true;
    console.warn("application reply: RESEND_API_KEY is not configured — nothing sent.");
    return result;
  }

  for (const lang of langs) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [input.to],
          reply_to: REPLY_TO,
          subject: subjectFor(lang, input),
          html: htmlFor(lang, input),
        }),
      });

      if (res.ok) {
        result.sent.push(lang);
      } else {
        result.failed.push(lang);
        const text = await res.text().catch(() => "");
        console.error("application reply: Resend", lang, res.status, text);
      }
    } catch (error) {
      result.failed.push(lang);
      console.error("application reply: could not send", lang, error);
    }
  }

  return result;
}
