"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearFailures, currentStaff, recordFailure, tooManyAttempts } from "@/lib/auth";
import { importCsv } from "@/lib/import-orders";
import { isOrderStatus } from "@/lib/order-status";
import { addNote, assignOrder, createOrder, deleteOrder, getOrder, setStatus } from "@/lib/orders";
import { mirrorOrderToSheet, sendOrderToSheet } from "@/lib/sheet-mirror";
import {
  canAssignOrders,
  countActiveAdmins,
  createStaff,
  deleteStaff,
  findStaffByEmail,
  findStaffById,
  updateStaff,
  verifyPassword,
  type Role,
} from "@/lib/staff";
import {
  decideLeaveRequest,
  isEmploymentType,
  isLeaveKind,
  requestLeave,
  updateHrProfile,
} from "@/lib/hr";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/staff-requests";
import { notify } from "@/lib/notifications";

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

/** Assignment is limited to coordinators and administrators. */
async function requireAssigner() {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  if (!canAssignOrders(staff.role)) redirect(`/portal?error=forbidden`);
  return staff;
}

function parseRole(value: string): Role {
  if (value === "admin") return "admin";
  if (value === "coordinator") return "coordinator";
  return "staff";
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
  const countryCode = String(formData.get("countryCode") ?? "964");
  const currency = String(formData.get("currency") ?? "USD").toUpperCase() === "IQD" ? "IQD" : "USD";

  if (!name || !phone) redirect("/portal/orders/new?error=missing-contact");

  let orderId: string;
  try {
    const order = await createOrder({
      name,
      phone,
      countryCode,
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
  const actor = await requireAssigner();
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

  await deleteOrder(orderId, actor.id, actor.name);
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
  const role = parseRole(String(formData.get("role") ?? "staff"));

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
  const role = parseRole(String(formData.get("role") ?? "staff"));
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

/* ----------------------------------- HR ----------------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveHrProfileAction(formData: FormData) {
  await requireAdminActor();

  const staffId = String(formData.get("staffId") ?? "");
  if (!staffId) redirect("/portal/hr");

  const employmentType = String(formData.get("employmentType") ?? "full_time");
  const hiredOn = String(formData.get("hiredOn") ?? "").trim();
  const annualLeaveDays = Number(formData.get("annualLeaveDays") ?? "0");

  const profile = await updateHrProfile(staffId, {
    jobTitle: String(formData.get("jobTitle") ?? ""),
    department: String(formData.get("department") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    hiredOn: ISO_DATE.test(hiredOn) ? hiredOn : null,
    employmentType: isEmploymentType(employmentType) ? employmentType : "full_time",
    annualLeaveDays: Number.isFinite(annualLeaveDays) ? annualLeaveDays : 0,
    notes: String(formData.get("notes") ?? ""),
  });

  revalidatePath("/portal/hr");
  if (!profile) redirect("/portal/hr?error=not-found");
  redirect("/portal/hr?saved=1");
}

export async function requestLeaveAction(formData: FormData) {
  const actor = await requireActor();

  const kind = String(formData.get("kind") ?? "annual");
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isLeaveKind(kind) || !ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
    redirect("/portal/hr/me?error=invalid-dates");
  }

  const result = await requestLeave({ staffId: actor.id, kind, startDate, endDate, reason });

  if (!result.ok) {
    redirect(`/portal/hr/me?error=${result.reason === "too-long" ? "too-long" : "invalid-dates"}`);
  }

  await notify({
    kind: "leave_request",
    summary: `${actor.name} requested ${result.days} day(s) of ${kind} leave`,
    actorId: actor.id,
    actorName: actor.name,
  });

  revalidatePath("/portal/hr/me");
  revalidatePath("/portal/hr");
  redirect(`/portal/hr/me?requested=${result.days}`);
}

export async function decideLeaveAction(formData: FormData) {
  const actor = await requireAdminActor();

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    redirect("/portal/hr");
  }

  const decided = await decideLeaveRequest({
    id: requestId,
    decision,
    reviewerId: actor.id,
    note,
  });

  revalidatePath("/portal/hr");
  if (!decided) redirect("/portal/hr?error=not-found");

  await notify({
    kind: "leave_decided",
    summary: `${decided.staff_name}'s leave request was ${decision} by ${actor.name}`,
    actorId: actor.id,
    actorName: actor.name,
  });

  redirect("/portal/hr?decided=1");
}

/* ------------------------------ join requests ------------------------------ */

export async function approveJoinRequestAction(formData: FormData) {
  const actor = await requireAdminActor();

  const requestId = String(formData.get("requestId") ?? "");
  const role = parseRole(String(formData.get("role") ?? "staff"));
  if (!requestId) redirect("/portal/requests");

  const result = await approveJoinRequest({ requestId, role, reviewerId: actor.id });

  if (!result.ok) {
    redirect(`/portal/requests?error=${result.reason}`);
  }

  await notify({
    kind: "staff_request",
    summary: `${result.name} was approved as ${role}`,
    actorId: actor.id,
    actorName: actor.name,
  });

  revalidatePath("/portal/requests");
  revalidatePath("/portal/staff");
  revalidatePath("/portal/hr");
  redirect("/portal/requests?approved=1");
}

export async function rejectJoinRequestAction(formData: FormData) {
  const actor = await requireAdminActor();

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) redirect("/portal/requests");

  const result = await rejectJoinRequest({ requestId, reviewerId: actor.id });

  if (result.ok && result.name) {
    await notify({
      kind: "staff_request",
      summary: `${result.name}'s request to join was declined`,
      actorId: actor.id,
      actorName: actor.name,
    });
  }

  revalidatePath("/portal/requests");
  redirect("/portal/requests?rejected=1");
}
