import { isAdmin } from "@/lib/auth";
import { importJobApplication } from "@/lib/job-applications";

export const runtime = "nodejs";

/**
 * Admin-only backfill for applications that arrived by email before the public
 * career form started writing to Postgres.
 *
 * One application per request (multipart/form-data) so the CV arrives as real
 * bytes instead of base64. `sourceEmailId` is the provider's message id; posting
 * the same message twice returns the existing row instead of duplicating it.
 * This route is called by an authenticated admin session only — it is not part
 * of the public career form.
 */

const MAX_CV_BYTES = 4.5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) {
    return Response.json({ ok: false, error: "Not signed in as an administrator." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const sourceEmailId = String(form.get("sourceEmailId") || "").trim();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const position = String(form.get("position") || "").trim();
  const message = String(form.get("message") || "").trim();
  const lang = String(form.get("lang") || "").trim();
  const createdAt = String(form.get("createdAt") || "").trim();
  const file = form.get("cv");

  if (!sourceEmailId || !name || !position) {
    return Response.json(
      { ok: false, error: "sourceEmailId, name and position are required." },
      { status: 400 },
    );
  }
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "A valid applicant email is required." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ ok: false, error: "The application CV is missing." }, { status: 400 });
  }
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return Response.json({ ok: false, error: "Only PDF CVs can be imported." }, { status: 400 });
  }
  if (file.size > MAX_CV_BYTES) {
    return Response.json(
      { ok: false, error: "The CV is larger than 4.5 MB." },
      { status: 413 },
    );
  }

  try {
    const result = await importJobApplication({
      name,
      email,
      phone,
      position,
      message,
      lang,
      cvName: file.name,
      cvType: file.type || "application/pdf",
      cvSize: file.size,
      cv: Buffer.from(await file.arrayBuffer()),
      createdAt,
      sourceEmailId,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("application import failed", error);
    return Response.json({ ok: false, error: "Could not store the application." }, { status: 500 });
  }
}
