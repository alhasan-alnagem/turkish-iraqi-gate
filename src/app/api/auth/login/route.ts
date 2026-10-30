import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  REMEMBER_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearFailures,
  createSessionToken,
  recordFailure,
  tooManyAttempts,
} from "@/lib/auth";
import { DatabaseConfigError, safeErrorMessage } from "@/lib/db";
import { ensureBootstrapAdmin, countStaff, findStaffByEmail, verifyPassword } from "@/lib/staff";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function throttleKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || "local";
}

export async function POST(request: NextRequest) {
  const key = throttleKey(request);
  if (tooManyAttempts(key)) {
    return Response.json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let email = "";
  let password = "";
  let remember = false;
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown; remember?: unknown };
    email = typeof body.email === "string" ? body.email : "";
    password = typeof body.password === "string" ? body.password : "";
    remember = body.remember === true;
  } catch {
    /* fall through to the generic failure */
  }

  if (!email || !password) {
    recordFailure(key);
    return Response.json({ error: "Enter your email and password." }, { status: 401 });
  }

  try {
    // First run: create the initial administrator from ADMIN_PASSWORD.
    await ensureBootstrapAdmin();
  } catch (error) {
    console.error("database unavailable during login", error);
    return Response.json(
      {
        error:
          error instanceof DatabaseConfigError
            ? error.message
            : `The database refused the connection: ${safeErrorMessage(error)}`,
      },
      { status: 503 },
    );
  }

  const staff = await findStaffByEmail(email);

  if (!staff && (await countStaff()) === 0) {
    return Response.json(
      {
        error:
          "No staff accounts exist yet. Set ADMIN_PASSWORD in Vercel (and ADMIN_EMAIL if you want a different address), redeploy, then sign in again.",
      },
      { status: 503 },
    );
  }

  // Same message and timing whether the account is missing, inactive or the
  // password is wrong — no account enumeration.
  if (!staff || !staff.active || !verifyPassword(password, staff.password_hash)) {
    recordFailure(key);
    await sleep(400);
    return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  clearFailures(key);

  const ttl = remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS;

  let token: string;
  try {
    token = createSessionToken(staff.id, ttl);
  } catch (error) {
    console.error("session secret missing", error);
    return Response.json(
      {
        error:
          "ADMIN_SESSION_SECRET is missing or too short (needs 16+ characters). Set it in Vercel and redeploy.",
      },
      { status: 503 },
    );
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });

  return Response.json({ ok: true, role: staff.role });
}
