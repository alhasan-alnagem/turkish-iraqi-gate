import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  adminConfigured,
  clearFailures,
  createSessionToken,
  passwordMatches,
  recordFailure,
  tooManyAttempts,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function throttleKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || "local";
}

export async function POST(request: NextRequest) {
  if (!adminConfigured()) {
    return Response.json(
      {
        error:
          "Admin access is not configured yet. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the environment.",
      },
      { status: 500 },
    );
  }

  const key = throttleKey(request);
  if (tooManyAttempts(key)) {
    return Response.json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  if (!password || !passwordMatches(password)) {
    recordFailure(key);
    // Small constant delay so the endpoint is not a fast oracle.
    await sleep(400);
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  clearFailures(key);

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return Response.json({ ok: true });
}
