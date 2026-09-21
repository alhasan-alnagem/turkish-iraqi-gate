import { NextRequest } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const TO_EMAIL = process.env.CAREER_TO_EMAIL || "alhasony1@gmail.com";
// Until the tigip.com domain is verified on resend.com/domains, Resend only
// allows sending from onboarding@resend.dev (to the account owner's email).
// Once verified, set CAREER_FROM_EMAIL="Careers at Turkish Iraqi Gate <careers@tigip.com>".
const FROM_EMAIL =
  process.env.CAREER_FROM_EMAIL ||
  "Careers at Turkish Iraqi Gate <onboarding@resend.dev>";
const MAX_CV_BYTES = 4 * 1024 * 1024; // 4 MB

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const position = String(form.get("position") || "").trim();
    const message = String(form.get("message") || "").trim();
    const lang = String(form.get("lang") || "").trim();
    const file = form.get("cv") as File | null;

    // --- Validation ---
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !position) {
      return Response.json(
        { success: false, message: "missing_fields" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return Response.json({ success: false, message: "cv_required" }, { status: 400 });
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return Response.json({ success: false, message: "cv_not_pdf" }, { status: 400 });
    }
    if (file.size > MAX_CV_BYTES) {
      return Response.json({ success: false, message: "cv_too_large" }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      console.error("Career API error: RESEND_API_KEY is not configured.");
      return Response.json(
        { success: false, message: "not_configured" },
        { status: 500 }
      );
    }

    // --- Build & send email ---
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;line-height:1.6">
        <h2 style="color:#14532d;margin-bottom:4px">New Job Application</h2>
        <p style="margin-top:0;color:#6b7280;font-size:13px">
          Position: <strong>${esc(position)}</strong> · Received: ${new Date().toISOString()}
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Full name</td><td style="padding:8px 12px">${esc(name)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Email</td><td style="padding:8px 12px">${esc(email)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Phone</td><td style="padding:8px 12px">${esc(phone) || "-"}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Position</td><td style="padding:8px 12px">${esc(position)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Site language</td><td style="padding:8px 12px">${esc(lang)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">CV file</td><td style="padding:8px 12px">${esc(file.name)} (${(file.size / 1024).toFixed(0)} KB)</td></tr>
        </table>
        ${message ? `<h3 style="margin-bottom:4px">Cover letter</h3><p style="white-space:pre-wrap;margin-top:0">${esc(message)}</p>` : ""}
        <p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">
          CV attached as <strong>${esc(file.name)}</strong>. Reply to this email to contact the applicant.
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
        subject: `New job application: ${position} — ${name}`,
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
      console.error("Career API error: Resend", res.status, text);
      return Response.json(
        { success: false, message: "email_failed" },
        { status: 502 }
      );
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Career API error:", error);
    return Response.json(
      { success: false, message: "error" },
      { status: 500 }
    );
  }
}