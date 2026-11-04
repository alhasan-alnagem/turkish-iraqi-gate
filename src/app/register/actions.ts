"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordFailure, tooManyAttempts } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { createJoinRequest } from "@/lib/staff-requests";
import { hashPassword } from "@/lib/staff";

/**
 * Public employee registration. Nothing is created here: the request waits on
 * /portal/requests until an administrator picks a role and approves it.
 *
 * The password is hashed before it is stored, and the form is rate-limited per
 * IP with the same in-memory throttle as the sign-in page. A double submission
 * cannot create two pending requests (partial unique index on the email).
 */
export async function registerAction(formData: FormData) {
  const headerBag = await headers();
  const forwarded = headerBag.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || headerBag.get("x-real-ip") || "unknown";
  const key = `register:${ip}`;

  if (tooManyAttempts(key)) redirect("/register?error=throttle");
  recordFailure(key);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (
    name.length < 2 ||
    name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8
  ) {
    redirect("/register?error=missing");
  }

  if (password !== confirm) redirect("/register?error=mismatch");

  const result = await createJoinRequest({
    name,
    email,
    phone: phone.slice(0, 40),
    message: message.slice(0, 1000),
    passwordHash: hashPassword(password),
  });

  if (!result.ok) {
    redirect(`/register?error=${result.reason === "exists" ? "exists" : "duplicate"}`);
  }

  await notify({
    kind: "staff_request",
    summary: `${name} asked to join the team`,
    actorName: name,
  });

  redirect("/register?sent=1");
}
