import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findStaffById, type Staff } from "@/lib/staff";

/**
 * Session handling for the staff portal and the catalog manager.
 *
 * The session cookie is `staffId.expiresAt.signature` — an HMAC over the first
 * two parts with ADMIN_SESSION_SECRET. The role is deliberately NOT trusted from
 * the cookie; every request re-reads the staff row, so revoking someone's access
 * takes effect immediately instead of when their cookie expires.
 *
 * Nothing here has anything to do with the PrivateEmail mailbox: that stays a
 * link to privateemail.com.
 */

export const SESSION_COOKIE = "tigip_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export class AuthConfigError extends Error {}

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new AuthConfigError("ADMIN_SESSION_SECRET is missing or shorter than 16 characters.");
  }
  return secret;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", sessionSecret()).update(payload).digest();
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSessionToken(staffId: string, now: number = Date.now()): string {
  const expires = now + SESSION_TTL_SECONDS * 1000;
  const payload = `${staffId}.${expires}`;
  return `${payload}.${sign(payload).toString("base64url")}`;
}

/** Returns the staff id encoded in a valid token, or null. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [staffId, payload, signature] = parts;
  if (!staffId || !payload || !signature) return null;

  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;

  let expected: Buffer;
  let provided: Buffer;
  try {
    expected = sign(`${staffId}.${payload}`);
    provided = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }

  return safeEqual(expected, provided) ? staffId : null;
}

/** The signed-in staff member, or null. */
export async function currentStaff(): Promise<Staff | null> {
  let staffId: string | null = null;
  try {
    const store = await cookies();
    staffId = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
  if (!staffId) return null;

  const staff = await findStaffById(staffId).catch(() => null);
  if (!staff || !staff.active) return null;
  return staff;
}

export async function isAdmin(): Promise<boolean> {
  const staff = await currentStaff();
  return staff?.role === "admin";
}

export async function isStaff(): Promise<boolean> {
  return (await currentStaff()) !== null;
}

/* ------------------------------------------------------------------------- */
/* Login throttle. Ephemeral per instance — a speed bump, not a guarantee.    */
/* ------------------------------------------------------------------------- */

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
