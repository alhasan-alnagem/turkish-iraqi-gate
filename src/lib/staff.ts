import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";

export type Role = "admin" | "coordinator" | "staff";

export const ROLES: readonly Role[] = ["admin", "coordinator", "staff"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  coordinator: "Coordinator",
  staff: "Staff",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Coordinators and administrators may assign orders; plain staff may not. */
export function canAssignOrders(role: Role): boolean {
  return role === "admin" || role === "coordinator";
}

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
};

type StaffRow = Staff & { password_hash: string };

const PUBLIC_COLUMNS = "id, name, email, role, active, created_at";

/* ------------------------------- passwords ------------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const derived = scryptSync(password, salt, 64);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/* --------------------------------- queries -------------------------------- */

export async function countStaff(): Promise<number> {
  const rows = await query<{ count: string }>("select count(*)::text as count from staff");
  return Number(rows[0]?.count ?? 0);
}

export async function findStaffByEmail(email: string): Promise<StaffRow | null> {
  const rows = await query<StaffRow>(
    `select ${PUBLIC_COLUMNS}, password_hash from staff where lower(email) = lower($1) limit 1`,
    [email.trim()],
  );
  return rows[0] ?? null;
}

export async function findStaffById(id: string): Promise<Staff | null> {
  const rows = await query<Staff>(`select ${PUBLIC_COLUMNS} from staff where id = $1 limit 1`, [id]);
  return rows[0] ?? null;
}

export async function listStaff(): Promise<Staff[]> {
  return query<Staff>(`select ${PUBLIC_COLUMNS} from staff order by role, name`);
}

export async function listActiveStaff(): Promise<Staff[]> {
  return query<Staff>(`select ${PUBLIC_COLUMNS} from staff where active order by name`);
}

export async function createStaff(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<Staff> {
  const rows = await query<Staff>(
    `insert into staff (name, email, password_hash, role)
     values ($1, lower($2), $3, $4)
     returning ${PUBLIC_COLUMNS}`,
    [input.name.trim(), input.email.trim(), hashPassword(input.password), input.role],
  );
  return rows[0];
}

export async function updateStaff(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean; password?: string },
): Promise<Staff | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.name !== undefined) {
    params.push(patch.name.trim());
    sets.push(`name = $${params.length}`);
  }
  if (patch.role !== undefined) {
    params.push(patch.role);
    sets.push(`role = $${params.length}`);
  }
  if (patch.active !== undefined) {
    params.push(patch.active);
    sets.push(`active = $${params.length}`);
  }
  if (patch.password) {
    params.push(hashPassword(patch.password));
    sets.push(`password_hash = $${params.length}`);
  }

  if (!sets.length) return findStaffById(id);

  params.push(id);
  const rows = await query<Staff>(
    `update staff set ${sets.join(", ")} where id = $${params.length} returning ${PUBLIC_COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

export async function countActiveAdmins(): Promise<number> {
  const rows = await query<{ count: string }>(
    "select count(*)::text as count from staff where role = 'admin' and active",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function deleteStaff(id: string): Promise<void> {
  await query("delete from staff where id = $1", [id]);
}

/* -------------------------------- bootstrap -------------------------------- */

/**
 * Creates the first administrator from ADMIN_PASSWORD the first time the portal
 * runs, so no credentials are ever committed to the repository.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;

  const existing = await countStaff();
  if (existing > 0) return;

  await createStaff({
    name: process.env.ADMIN_NAME ?? "Alhasan Alnagem",
    email: process.env.ADMIN_EMAIL ?? "alhasan.alnagem@tigip.com",
    password,
    role: "admin",
  });
}

export async function adminExists(): Promise<boolean> {
  const rows = await query<{ count: string }>(
    "select count(*)::text as count from staff where role = 'admin'",
  );
  return Number(rows[0]?.count ?? 0) > 0;
}
