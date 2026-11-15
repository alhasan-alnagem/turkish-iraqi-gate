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

import type { ReplyLanguage } from "@/lib/reply-languages";
import { calendarAttachment, buildCalendarInvite, interviewUid } from "@/lib/calendar-invite";
import { portalSubject } from "@/lib/portal-mail";

export {
  REPLY_LANGUAGES,
  REPLY_LANGUAGE_LABELS,
  isReplyLanguage,
  parseReplyLanguages,
  type ReplyLanguage,
} from "@/lib/reply-languages";

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

/**
 * Interviews are always written day/month/year (`14/11/2026`) — the same date
 * the staff type in the portal and the applicant reads in the invitation.
 */
export function formatInterview(stamp: string | Date | null): string {
  if (!stamp) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OFFICE_TZ,
  }).format(new Date(stamp));
}

/** Real calendar days only — `31/02/2026` is refused, not rolled over. */
function isoDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Reads what staff type into the interview date box: `dd/mm/yyyy` (the normal
 * case), with `d/m/yyyy`, `dd-mm-yyyy` and `yyyy-mm-dd` accepted so a pasted
 * value still works. Returns `yyyy-mm-dd` for `interviewStamp`, or `""` when
 * the text is not a real date.
 */
export function parseOfficeDate(value: string): string {
  const clean = value.trim().replace(/\s+/g, "");
  const dayFirst = clean.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return isoDate(Number(year), Number(month), Number(day));
  }
  const yearFirst = clean.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    return isoDate(Number(year), Number(month), Number(day));
  }
  return "";
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
  /** Job application id — gives the calendar invitation a stable UID. */
  applicationId?: string;
};

export type ReplyAttempt = {
  lang: ReplyLanguage;
  /** Every language whose copy is in the message (the record in the portal). */
  langs: ReplyLanguage[];
  subject: string;
  /** The message as plain text, stored and shown in the portal. */
  body: string;
  status: "sent" | "failed";
  error: string;
};

export type ReplyResult = {
  sent: ReplyLanguage[];
  skipped: boolean;
  failed: ReplyLanguage[];
  attempts: ReplyAttempt[];
};

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL =
  process.env.CAREER_FROM_EMAIL ||
  "Careers at Turkish Iraqi Gate <onboarding@resend.dev>";
/**
 * Where applicant answers go. This must be a real, receiving mailbox on
 * tigip.com — `careers.tigip.com` is send-only (Resend DKIM, no MX), so an
 * address there cannot receive anything. `careers@tigip.com` was created in
 * PrivateEmail for exactly this.
 */
const REPLY_TO = process.env.CAREER_REPLY_TO || "careers@tigip.com";
/**
 * A blind copy of every applicant email goes to the same mailbox, so the
 * conversation is at least visible in PrivateEmail's inbox. Resend sends
 * directly and never writes to the mailbox's Sent folder. Defaults to the
 * reply-to address; never point this at the send-only careers subdomain.
 */
const BCC_EMAIL = process.env.CAREER_BCC_EMAIL || REPLY_TO;
/**
 * Where the office copy of an interview invitation goes — the address whose
 * PrivateEmail calendar should show the booking. It is the founder's own
 * mailbox, NOT `careers@`: that address is the calendar ORGANIZER, and a
 * message whose organizer is also its recipient is treated as "your own
 * copy" instead of an invitation, so no event is ever created from it.
 */
const OFFICE_EMAIL =
  process.env.CAREER_CALENDAR_EMAIL || "alhasan.alnagem@tigip.com";

function recipients(to: string): { to: string[]; bcc?: string[] } {
  return BCC_EMAIL && BCC_EMAIL !== to
    ? { to: [to], bcc: [BCC_EMAIL] }
    : { to: [to] };
}

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

/**
 * One language's letter. Used for a single-language reply exactly as before,
 * and stacked inside one message when several languages are ticked.
 */
function bodyHtmlFor(lang: ReplyLanguage, input: ReplyInput): string {
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

  return `<h2 style="margin:0 0 16px;color:#0f5624;font-size:20px">${copy.heading}</h2>
      <p style="margin:0 0 12px">${copy.greeting(esc(input.name))}</p>
      <p style="margin:0 0 12px">${copy.lead(input.position)}</p>
      <p style="margin:0 0 12px">${intro}</p>
      ${interviewBlock}
      ${personal}
      <p style="margin:20px 0 0">${copy.signature}</p>
      <p style="margin:4px 0 0;color:#0f5624;font-weight:600">${copy.company}</p>`;
}

/**
 * ONE message for the whole reply — whatever the language tick list says.
 *
 * It used to send a separate mail per ticked language, which meant an applicant
 * could receive the same decision three times. The primary language (the first
 * box ticked) comes first and gives the subject; every other ticked language
 * follows below a rule, each in its own direction, so no block is ever mixed.
 */
function htmlFor(langs: ReplyLanguage[], input: ReplyInput): string {
  const primary = COPY[langs[0]];
  const body = langs
    .map((lang) => {
      const copy = COPY[lang];
      return `<div dir="${copy.dir}" style="text-align:${
        copy.dir === "rtl" ? "right" : "left"
      }">${bodyHtmlFor(lang, input)}</div>`;
    })
    .join('<hr style="border:0;border-top:1px solid #e5e7eb;margin:26px 0">');

  return `<!doctype html>
  <html lang="${langs[0]}" dir="${primary.dir}">
  <body style="margin:0;padding:24px 12px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;line-height:1.65;text-align:${
      primary.dir === "rtl" ? "right" : "left"
    }">
      <p style="margin:0 0 6px;color:#16a34a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Turkish Iraqi Gate</p>
      ${body}
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
  return portalSubject(`${base} — ${suffix}`);
}

/** Event title/location per language — the body is localized, so is the invite. */
const INTERVIEW_EVENT: Record<ReplyLanguage, { title: (position: string) => string }> = {
  en: { title: (position) => `Interview — ${position} — Turkish Iraqi Gate` },
  ar: { title: (position) => `مقابلة — ${position} — بوابة تركيا العراقية` },
  tr: { title: (position) => `Mülakat — ${position} — Turkish Iraqi Gate` },
};

function interviewInviteFor(
  lang: ReplyLanguage,
  input: ReplyInput,
  applicationId?: string,
  cancelled = false,
  description?: string,
): string {
  const interview = input.interview;
  if (!interview) return "";
  return buildCalendarInvite({
    uid: interviewUid(applicationId || input.to),
    start: interview.at,
    minutes: 45,
    summary: INTERVIEW_EVENT[lang].title(input.position),
    description: description || textFor(lang, input),
    location: interview.mode,
    organizer: REPLY_TO,
    attendees: [input.to],
    cancelled,
  });
}

/** The same copy as the HTML mail, without markup — this is what the portal shows. */
function plain(value: string): string {
  return value
    .replace(/<\/?strong>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function textFor(lang: ReplyLanguage, input: ReplyInput): string {
  const copy = COPY[lang];
  const labels = INTERVIEW_LABELS[lang];
  const lines = [
    "TURKISH IRAQI GATE",
    plain(copy.heading),
    "",
    plain(copy.greeting(esc(input.name))),
    "",
    plain(copy.lead(input.position)),
    "",
    plain(MESSAGE[lang][input.kind](input.position)),
  ];

  if (input.kind === "interview" && input.interview) {
    lines.push("", `${labels.when}: ${formatInterview(input.interview.at)}`);
    if (input.interview.mode) lines.push(`${labels.how}: ${input.interview.mode}`);
    if (input.interview.note) lines.push(`${labels.note}: ${input.interview.note}`);
    lines.push(labels.closing);
  }

  if (input.note) lines.push("", input.note);

  lines.push("", plain(copy.signature), plain(copy.company), "", "tigip.com");
  return lines.join("\n");
}

/** The plain-text body of the single message: every ticked language, in order. */
function textForLangs(langs: ReplyLanguage[], input: ReplyInput): string {
  const divider = "-".repeat(46);
  return langs.map((lang) => textFor(lang, input)).join(`\n\n${divider}\n\n`);
}

/**
 * A free-text reply typed by an administrator. Subject and body are used
 * exactly as written (the body is escaped and keeps its line breaks), so this
 * is the "reply manually" path — no template and no language tick list.
 */
export async function sendManualReply(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{
  sent: boolean;
  skipped: boolean;
  providerId: string;
  error: string;
  /** The message as plain text, including the header/footer the applicant sees. */
  text: string;
}> {
  const text = `Turkish Iraqi Gate\n\n${input.body.trim()}\n\ntigip.com`;

  if (!RESEND_API_KEY) {
    console.warn("manual application reply: RESEND_API_KEY is not configured — nothing sent.");
    return { sent: false, skipped: true, providerId: "", error: "Mail is not configured.", text };
  }

  const subject = portalSubject(
    input.subject.trim().replace(/\s+/g, " ").slice(0, 200) ||
      "Your application — Turkish Iraqi Gate",
  );

  const html = `<!doctype html>
  <html lang="en">
  <body style="margin:0;padding:24px 12px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;line-height:1.65">
      <p style="margin:0 0 6px;color:#16a34a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Turkish Iraqi Gate</p>
      <div dir="auto" style="margin:16px 0 0;white-space:pre-wrap;text-align:start">${esc(input.body.trim())}</div>
      <p style="margin:20px 0 0;border-top:1px solid #e5e7eb;padding-top:12px;color:#6b7280;font-size:12px">
        tigip.com
      </p>
    </div>
  </body>
  </html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        ...recipients(input.to),
        reply_to: REPLY_TO,
        subject,
        html,
        text,
      }),
    });

    const raw = await res.text().catch(() => "");

    if (res.ok) {
      let providerId = "";
      try {
        providerId = (JSON.parse(raw) as { id?: string }).id ?? "";
      } catch {
        providerId = "";
      }
      return { sent: true, skipped: false, providerId, error: "", text };
    }

    console.error("manual application reply: Resend", res.status, raw);
    return { sent: false, skipped: false, providerId: "", error: raw.slice(0, 500), text };
  } catch (error) {
    console.error("manual application reply: could not send", error);
    return {
      sent: false,
      skipped: false,
      providerId: "",
      error: error instanceof Error ? error.message : "Could not reach the mail service.",
      text,
    };
  }
}

/**
 * The decision / invitation letter: always ONE message per action, no matter
 * how many language boxes were ticked. The first ticked language is the primary
 * one and gives the subject; the rest follow in the same mail, each in its own
 * direction. Returns the languages that went out and a single record for
 * `application_emails`.
 */
export async function sendApplicationReply(input: ReplyInput): Promise<ReplyResult> {
  const langs = Array.from(new Set(input.langs));
  const result: ReplyResult = { sent: [], skipped: false, failed: [], attempts: [] };

  if (langs.length === 0) return result;

  if (!RESEND_API_KEY) {
    result.skipped = true;
    console.warn("application reply: RESEND_API_KEY is not configured — nothing sent.");
    return result;
  }

  const subject = subjectFor(langs[0], input);
  const text = textForLangs(langs, input);
  // An interview invitation is also a real calendar invitation: the .ics part
  // is what makes it appear in the recipient's calendar (PrivateEmail reads
  // standard iCal), and it carries the same details as the message.
  const ics =
    input.kind === "interview" && input.interview
      ? interviewInviteFor(langs[0], input, input.applicationId, false, text)
      : "";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        ...recipients(input.to),
        reply_to: REPLY_TO,
        subject,
        html: htmlFor(langs, input),
        text,
        ...(ics ? { attachments: [calendarAttachment(ics)] } : {}),
      }),
    });

    if (res.ok) {
      result.sent = langs;
      result.attempts.push({
        lang: langs[0],
        langs,
        subject,
        body: text,
        status: "sent",
        error: "",
      });
    } else {
      result.failed = langs;
      const raw = await res.text().catch(() => "");
      console.error("application reply: Resend", langs.join(","), res.status, raw);
      result.attempts.push({
        lang: langs[0],
        langs,
        subject,
        body: text,
        status: "failed",
        error: `${res.status} ${raw}`.slice(0, 500),
      });
    }
  } catch (error) {
    result.failed = langs;
    console.error("application reply: could not send", langs.join(","), error);
    result.attempts.push({
      lang: langs[0],
      langs,
      subject,
      body: text,
      status: "failed",
      error: error instanceof Error ? error.message : "Could not reach the mail service.",
    });
  }

  return result;
}

/**
 * The office copy of an interview booking.
 *
 * The applicant already gets their own invitation; this one goes to the
 * tigip.com mailbox so the interview shows up in the PrivateEmail calendar
 * (a standard iCal invitation is added as a pending event) and so the booking
 * is visible in the inbox the portal filters sort. It is sent whether or not
 * the applicant invite box was ticked — booking a time IS the calendar action.
 */
export async function sendOfficeInterviewInvite(input: {
  applicationId: string;
  name: string;
  email: string;
  position: string;
  at: string;
  mode: string;
  note: string;
  /** Clearing the interview sends an iCal cancellation instead. */
  cancelled?: boolean;
}): Promise<{ sent: boolean; skipped: boolean; error: string }> {
  if (!RESEND_API_KEY) {
    return { sent: false, skipped: true, error: "Mail is not configured." };
  }
  if (!input.at) {
    return { sent: false, skipped: true, error: "No interview time." };
  }

  const cancelled = Boolean(input.cancelled);
  const when = formatInterview(input.at);
  const subject = portalSubject(
    cancelled
      ? `Interview cancelled — ${input.name} — ${input.position}`
      : `Interview booked — ${input.name} — ${input.position}`,
  );

  const details = [
    ["Candidate", input.name],
    ["Email", input.email],
    ["Position", input.position],
    ["Date and time", `${when} (Baghdad time, GMT+3)`],
    ["Format", input.mode || "—"],
    ["Notes", input.note || "—"],
  ];

  const rows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:150px">${esc(label)}</td><td style="padding:8px 12px">${esc(value)}</td></tr>`,
    )
    .join("");

  const text = [
    cancelled ? "INTERVIEW CANCELLED" : "INTERVIEW BOOKED",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    cancelled
      ? "The calendar invitation has been withdrawn."
      : "The invitation is attached — accept it to put the interview on the calendar.",
    "",
    `https://www.tigip.com/portal/applications?app=${input.applicationId}`,
  ].join("\n");

  const html = `<!doctype html>
  <html lang="en">
  <body style="margin:0;padding:24px 12px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;line-height:1.65">
      <p style="margin:0 0 6px;color:#16a34a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Turkish Iraqi Gate</p>
      <h2 style="margin:0 0 16px;color:#0f5624;font-size:20px">${cancelled ? "Interview cancelled" : "Interview booked"}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      <p style="margin:16px 0 0;color:#6b7280;font-size:13px">
        ${
          cancelled
            ? "The calendar invitation has been withdrawn."
            : "The calendar invitation is attached — accept it to put the interview on the calendar."
        }
      </p>
      <p style="margin:16px 0 0;border-top:1px solid #e5e7eb;padding-top:12px;font-size:13px">
        <a href="https://www.tigip.com/portal/applications?app=${encodeURIComponent(input.applicationId)}" style="color:#0f5624">Open in the portal</a>
      </p>
    </div>
  </body>
  </html>`;

  const ics = buildCalendarInvite({
    uid: interviewUid(input.applicationId),
    start: input.at,
    minutes: 45,
    summary: cancelled
      ? `Cancelled: Interview — ${input.position} — Turkish Iraqi Gate`
      : `Interview — ${input.position} — Turkish Iraqi Gate`,
    description: text,
    location: input.mode,
    // The organizer is the careers mailbox; the office address is an ATTENDEE,
    // because a calendar only accepts an invitation for an address it can see
    // in ATTENDEE (self-organised invites are ignored as "my own copy").
    organizer: REPLY_TO,
    attendees: [OFFICE_EMAIL, input.email],
    cancelled,
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [OFFICE_EMAIL],
        reply_to: REPLY_TO,
        subject,
        html,
        text,
        attachments: [calendarAttachment(ics)],
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      console.error("office interview invite: Resend", res.status, raw);
      return { sent: false, skipped: false, error: `${res.status} ${raw}`.slice(0, 500) };
    }

    return { sent: true, skipped: false, error: "" };
  } catch (error) {
    console.error("office interview invite: could not send", error);
    return {
      sent: false,
      skipped: false,
      error: error instanceof Error ? error.message : "Could not reach the mail service.",
    };
  }
}
