import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin session handling for the TIGIP catalog manager.
 *
 * Deliberately independent of the PrivateEmail mailbox: the panel authenticates
 * against an ADMIN_PASSWORD stored in the environment, and reaching the mailbox
 * is a plain link to privateemail.com. No mailbox credentials ever reach this
 * server or the browser.
 */

export const ADMIN_COOKIE = "tigip_admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Thrown when the deployment is missing its admin configuration. */
export class AdminConfigError extends Error {}

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new AdminConfigError(
      "ADMIN_SESSION_SECRET is missing or shorter than 16 characters.",
    );
  }
  return secret;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", sessionSecret()).update(payload).digest();
}

/** Constant-time string comparison that does not leak length. */
function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(now: number = Date.now()): string {
  const expires = now + SESSION_TTL_SECONDS * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload).toString("base64url")}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  let expected: Buffer;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }

  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }

  return safeEqual(expected, provided);
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // HMAC both sides so the comparison is fixed-length and non-short-circuiting.
  const key = process.env.ADMIN_SESSION_SECRET ?? "tigip-admin-compare";
  const a = createHmac("sha256", key).update(candidate).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return safeEqual(a, b);
}

/** True when the current request carries a valid admin cookie. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET &&
      process.env.ADMIN_SESSION_SECRET.length >= 16,
  );
}

/* ------------------------------------------------------------------ */
/* Very small in-memory throttle for the login form.                   */
/* Serverless instances are short-lived, so this is a speed bump        */
/* rather than a guarantee; the password itself carries the real      */
/* weight.                                                             */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}
