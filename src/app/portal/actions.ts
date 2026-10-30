"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearFailures, currentStaff, recordFailure, tooManyAttempts } from "@/lib/auth";
import { importCsv } from "@/lib/import-orders";
import { isOrderStatus } from "@/lib/order-status";
import { addNote, assignOrder, createOrder, deleteOrder, getOrder, setStatus } from "@/lib/orders";
import { mirrorOrderToSheet, sendOrderToSheet } from "@/lib/sheet-mirror";
import {
  countActiveAdmins,
  createStaff,
  deleteStaff,
  findStaffByEmail,
  findStaffById,
  updateStaff,
  verifyPassword,
} from "@/lib/staff";

async function requireActor() {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  return staff;
}

async function requireAdminActor() {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  if (staff.role !== "admin") redirect("/portal?error=forbidden");
  return staff;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------- my account ------------------------------- */

/**
 * Self-service password change. The current password is required so a borrowed
 * unlocked browser cannot be used to lock the owner out.
 */
export async function changeOwnPasswordAction(formData: FormData) {
  const actor = await requireActor();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  // Same throttle shape as the sign-in form, keyed per account.
  const key = `password:${actor.id}`;
  if (tooManyAttempts(key)) redirect("/portal/account?error=too-many");
  if (next.length < 8) redirect("/portal/account?error=short");
  if (next !== confirmation) redirect("/portal/account?error=mismatch");
  if (next === current) redirect("/portal/account?error=unchanged");

  const row = await findStaffByEmail(actor.email);
  if (!row || !row.active || !verifyPassword(current, row.password_hash)) {
    recordFailure(key);
    await sleep(300);
    redirect("/portal/account?error=wrong-current");
  }

  clearFailures(key);
  await updateStaff(actor.id, { password: next });

  revalidatePath("/portal/account");
  redirect("/portal/account?changed=1");
}

/* --------------------------------- orders --------------------------------- */

export async function createOrderAction(formData: FormData) {
  const actor = await requireActor();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").toUpperCase() === "IQD" ? "IQD" : "USD";

  if (!name || !phone) redirect("/portal/orders/new?error=missing-contact");

  let orderId: string;
  try {
    const order = await createOrder({
      name,
      phone,
      city: String(formData.get("city") ?? "").trim(),
      product: String(formData.get("product") ?? "").trim(),
      quantity: String(formData.get("quantity") ?? "").trim(),
      budget: String(formData.get("budget") ?? "").trim(),
      currency,
      shipping: formData.get("shipping") === "yes",
      details: String(formData.get("details") ?? "").trim(),
      source: "manual",
      eventNote: `Order added manually by ${actor.name}`,
      actorId: actor.id,
      actorName: actor.name,
    });
    orderId = order.id;

    // Keep the spreadsheet copy in step with the portal (no-op when the sheet
    // is not configured).
    mirrorOrderToSheet(order);
  } catch (error) {
    console.error("manual order creation failed", error);
    redirect("/portal/orders/new?error=create-failed");
  }

  revalidatePath("/portal");
  redirect(`/portal/orders/${orderId}`);
}

export async function changeStatusAction(formData: FormData) {
  const actor = await requireActor();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!orderId || !isOrderStatus(status)) {
    redirect(`/portal/orders/${orderId}?error=invalid-status`);
  }

  await setStatus(orderId, status, actor.id, actor.name, note || undefined);
  revalidatePath(`/portal/orders/${orderId}`);
  revalidatePath("/portal");
}

export async function assignAction(formData: FormData) {
  const actor = await requireActor();
  const orderId = String(formData.get("orderId") ?? "");
  const staffId = String(formData.get("staffId") ?? "");

  if (!orderId) redirect("/portal");

  if (!staffId || staffId === "none") {
    await assignOrder(orderId, null, actor.id, actor.name);
  } else {
    const assignee = await findStaffById(staffId);
    await assignOrder(orderId, staffId, actor.id, actor.name, assignee?.name ?? null);
  }

  revalidatePath(`/portal/orders/${orderId}`);
  revalidatePath("/portal");
}

export async function noteAction(formData: FormData) {
  const actor = await requireActor();
  const orderId = String(formData.get("orderId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!orderId || !note) redirect(`/portal/orders/${orderId}`);
  await addNote(orderId, note, actor.id, actor.name);
  revalidatePath(`/portal/orders/${orderId}`);
}

/** Re-sends one order to the spreadsheet (backfill or retry after a failure). */
export async function sendToSheetAction(formData: FormData) {
  await requireActor();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/portal");

  const order = await getOrder(orderId);
  if (!order) redirect("/portal");

  const result = await sendOrderToSheet(order);
  if (!result.ok) console.error("Google Sheets write failed:", result.reason);

  redirect(`/portal/orders/${orderId}?sheet=${result.ok ? "sent" : "failed"}`);
}

/** Deleting is admin-only and irreversible, so it lives on the detail page. */
export async function deleteOrderAction(formData: FormData) {
  const actor = await requireAdminActor();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/portal");

  const order = await getOrder(orderId);
  if (!order) redirect("/portal");

  await deleteOrder(orderId);
  console.warn(`order ${order.ref} deleted by ${actor.name} (${actor.id})`);

  revalidatePath("/portal");
  redirect("/portal?deleted=1");
}

/* --------------------------------- import --------------------------------- */
export async function importOrdersAction(formData: FormData) {
  await requireAdminActor();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/portal/import?error=no-file");
  }

  const text = await file.text();
  const result = await importCsv(text);

  revalidatePath("/portal");
  revalidatePath("/portal/import");

  redirect(`/portal/import?created=${result.created}&skipped=${result.skipped}&failed=${result.failed}`);
}

/* --------------------------------- staff ---------------------------------- */

export async function createStaffAction(formData: FormData) {
  const actor = await requireAdminActor();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";

  if (!name || !email || password.length < 8) {
    redirect("/portal/staff?error=missing-fields");
  }

  try {
    await createStaff({ name, email, password, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.includes("duplicate key") ? "duplicate-email" : "create-failed";
    redirect(`/portal/staff?error=${code}`);
  }

  revalidatePath("/portal/staff");
  revalidatePath("/portal");
  void actor;
}

export async function updateStaffAction(formData: FormData) {
  const actor = await requireAdminActor();
  const staffId = String(formData.get("staffId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";
  const password = String(formData.get("password") ?? "");

  if (!staffId) redirect("/portal/staff");

  const target = await findStaffById(staffId);
  if (!target) redirect("/portal/staff?error=not-found");

  // Never let the last administrator demote themselves out of the panel.
  if (target.role === "admin" && role !== "admin") {
    const admins = await countActiveAdmins();
    if (admins <= 1) redirect("/portal/staff?error=last-admin");
  }

  await updateStaff(staffId, {
    name: name || target.name,
    role,
    password: password.length >= 8 ? password : undefined,
  });

  revalidatePath("/portal/staff");
  void actor;
}

export async function removeStaffAction(formData: FormData) {
  const actor = await requireAdminActor();
  const staffId = String(formData.get("staffId") ?? "");

  if (!staffId) redirect("/portal/staff");
  if (staffId === actor.id) redirect("/portal/staff?error=self-delete");

  const target = await findStaffById(staffId);
  if (target?.role === "admin") {
    const admins = await countActiveAdmins();
    if (admins <= 1) redirect("/portal/staff?error=last-admin");
  }

  await deleteStaff(staffId);
  revalidatePath("/portal/staff");
  revalidatePath("/portal");
}
