import { NextRequest } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const TO_EMAIL =
  process.env.CATALOG_TO_EMAIL || process.env.CAREER_TO_EMAIL || "alhasony1@gmail.com";
// Until the tigip.com domain is verified on resend.com/domains, Resend only
// allows sending from onboarding@resend.dev (to the account owner's email).
// Once verified, set CAREER_FROM_EMAIL="Careers at Turkish Iraqi Gate <careers@tigip.com>".
const FROM_EMAIL =
  process.env.CAREER_FROM_EMAIL ||
  "Turkish Iraqi Gate <onboarding@resend.dev>";
const MAX_CATALOG_BYTES = 4 * 1024 * 1024; // 4 MB

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LangKey = "en" | "ar" | "tr";

// Confirmation email sent to the submitter after a successful submission,
// written in the language they used on the site.
const ackTemplates: Record<
  LangKey,
  { subject: string; html: (company: string) => string }
> = {
  en: {
    subject: "We received your catalog submission — Turkish Iraqi Gate",
    html: (company) => `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">
        <h2 style="color:#14532d;margin-bottom:4px">Thank you for submitting your catalog</h2>
        <p>Hi,<br/><br/>
        We've received the catalog submission from <strong>${esc(company)}</strong>.</p>
        <p>Our team will review your products and get back to you soon regarding listing it on our website.</p>
        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">
          Turkish Iraqi Gate For Importing And Procurement</p>
      </div>
    `,
  },
  ar: {
    subject: "استلمنا كتالوجك — Turkish Iraqi Gate",
    html: (company) => `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.8;direction:rtl">
        <h2 style="color:#14532d;margin-bottom:4px">شكراً لإرسال كتالوجك</h2>
        <p>مرحباً،<br/><br/>
        استلمنا طلب الكتالوج المقدَّم من <strong>${esc(company)}</strong>.</p>
        <p>سيراجع فريقنا منتجاتك وسيعود إليك قريباً بخصوص إدراجها على موقعنا.</p>
        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">
          Turkish Iraqi Gate For Importing And Procurement</p>
      </div>
    `,
  },
  tr: {
    subject: "Kataloğunuzu aldık — Turkish Iraqi Gate",
    html: (company) => `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">
        <h2 style="color:#14532d;margin-bottom:4px">Kataloğunuzu gönderdiğiniz için teşekkürler</h2>
        <p>Merhaba,<br/><br/>
        <strong>${esc(company)}</strong> şirketinden katalog başvurusunu aldık.</p>
        <p>Ekibimiz ürünlerinizi inceleyecek ve web sitemizde listelenmesi hakkında en kısa sürede size dönüş yapacaktır.</p>
        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">
          Turkish Iraqi Gate For Importing And Procurement</p>
      </div>
    `,
  },
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const company = String(form.get("company") || "").trim();
    const contactName = String(form.get("contactName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const category = String(form.get("category") || "").trim();
    const website = String(form.get("website") || "").trim();
    const message = String(form.get("message") || "").trim();
    const lang = String(form.get("lang") || "").trim();
    const file = form.get("catalog") as File | null;

    // --- Validation ---
    if (
      !company ||
      !contactName ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !category
    ) {
      return Response.json(
        { success: false, message: "missing_fields" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return Response.json(
        { success: false, message: "catalog_required" },
        { status: 400 }
      );
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return Response.json(
        { success: false, message: "catalog_not_pdf" },
        { status: 400 }
      );
    }
    if (file.size > MAX_CATALOG_BYTES) {
      return Response.json(
        { success: false, message: "catalog_too_large" },
        { status: 400 }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("Catalog API error: RESEND_API_KEY is not configured.");
      return Response.json(
        { success: false, message: "not_configured" },
        { status: 500 }
      );
    }

    // --- Build & send email (always sent to the company inbox in English) ---
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;line-height:1.6">
        <h2 style="color:#14532d;margin-bottom:4px">New Catalog Submission</h2>
        <p style="margin-top:0;color:#6b7280;font-size:13px">
          Category: <strong>${esc(category)}</strong> · Received: ${new Date().toISOString()}
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Company</td><td style="padding:8px 12px">${esc(company)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Contact person</td><td style="padding:8px 12px">${esc(contactName)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Email</td><td style="padding:8px 12px">${esc(email)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Phone</td><td style="padding:8px 12px">${esc(phone) || "-"}</td></tr>
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Category</td><td style="padding:8px 12px">${esc(category)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Website</td><td style="padding:8px 12px">${esc(website) || "-"}</td></tr>
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Site language</td><td style="padding:8px 12px">${esc(lang)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Catalog file</td><td style="padding:8px 12px">${esc(file.name)} (${(file.size / 1024).toFixed(0)} KB)</td></tr>
        </table>
        ${message ? `<h3 style="margin-bottom:4px">Message</h3><p style="white-space:pre-wrap;margin-top:0">${esc(message)}</p>` : ""}
        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">
          Catalog attached as <strong>${esc(file.name)}</strong>. Reply to this email to contact the submitter.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `New catalog submission: ${category} — ${company}`,
        html,
        attachments: [
          {
            filename: file.name,
            content: base64,
            content_type: "application/pdf",
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Catalog API error: Resend", res.status, text);
      return Response.json(
        { success: false, message: "email_failed" },
        { status: 502 }
      );
    }

    // Best-effort confirmation to the submitter in their site language
    // (same fallback-sender caveat as the careers form: onboarding@resend.dev
    // can only reach the account owner's inbox until the domain is verified).
    const langKey: LangKey = lang === "ar" || lang === "tr" ? lang : "en";
    const ack = ackTemplates[langKey];
    try {
      const ackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: ack.subject,
          html: ack.html(company),
        }),
      });
      if (!ackRes.ok) {
        const text = await ackRes.text().catch(() => "");
        console.error(
          "Catalog API warning: submitter ack failed",
          ackRes.status,
          text
        );
      }
    } catch (err) {
      console.error("Catalog API warning: submitter ack failed", err);
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Catalog API error:", error);
    return Response.json(
      { success: false, message: "error" },
      { status: 500 }
    );
  }
}