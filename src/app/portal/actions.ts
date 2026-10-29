"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { importCsv } from "@/lib/import-orders";
import { isOrderStatus } from "@/lib/order-status";
import { addNote, assignOrder, setStatus } from "@/lib/orders";
import {
  countActiveAdmins,
  createStaff,
  deleteStaff,
  findStaffById,
  updateStaff,
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

/* --------------------------------- orders --------------------------------- */

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
