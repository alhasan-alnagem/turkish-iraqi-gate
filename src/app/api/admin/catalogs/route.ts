import { del } from "@vercel/blob";
import { isAdmin } from "@/lib/auth";
import { listCatalogsByCategory } from "@/lib/catalogs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const grouped = await listCatalogsByCategory();
  return Response.json({ catalogs: grouped });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let url = "";
  try {
    const body = (await request.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    url = "";
  }

  if (!/^https:\/\/[a-z0-9-]+\.blob\.vercel-storage\.com\//i.test(url)) {
    return Response.json({ error: "Only uploaded catalogs can be deleted." }, { status: 400 });
  }

  try {
    await del(url);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
