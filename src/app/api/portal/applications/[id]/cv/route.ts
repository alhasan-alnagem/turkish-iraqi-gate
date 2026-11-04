import type { NextRequest } from "next/server";
import { currentStaff } from "@/lib/auth";
import { getApplicationCv } from "@/lib/job-applications";

/**
 * Admin-only CV download. The file lives in Postgres, not in a public blob, so
 * this route is the only way to read it. Anyone who is not an administrator
 * gets the same response as a missing file.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin") {
    return new Response("Not found", { status: 404 });
  }

  const { id } = await params;
  const cv = await getApplicationCv(id);
  if (!cv) return new Response("Not found", { status: 404 });

  const name = (cv.name || "cv.pdf").replace(/[^\w.\- ]+/g, "_").slice(-120) || "cv.pdf";

  return new Response(new Uint8Array(cv.data), {
    headers: {
      "content-type": cv.type || "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
