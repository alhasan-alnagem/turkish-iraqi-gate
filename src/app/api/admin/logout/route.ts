import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
