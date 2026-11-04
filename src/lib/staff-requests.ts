import "server-only";

import { query } from "@/lib/db";
import { createStaffWithHash, type Role } from "@/lib/staff";

/**
 * Public "register as an employee" requests.
 *
 * The applicant picks a password on the public site and it is hashed before it
 * is stored, so approving is a role choice — no password ever travels back
 * through an email or a spreadsheet. One open request per email (enforced by a
 * partial unique index) keeps a double-click from filling the queue.
 */

export type JoinRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
};

const COLUMNS = `
  r.id, r.name, r.email, r.phone, r.message, r.status, r.created_at, r.reviewed_at,
  s.name as reviewed_by_name
`;

const JOIN = "from staff_requests r left join staff s on s.id = r.reviewed_by";

export async function listJoinRequests(status: JoinRequest["status"] = "pending"): Promise<JoinRequest[]> {
  return query<JoinRequest>(
    `select ${COLUMNS} ${JOIN} where r.status = $1 order by r.created_at desc limit 100`,
    [status],
  );
}

export async function countPendingJoinRequests(): Promise<number> {
  const rows = await query<{ count: string }>(
    "select count(*)::text as count from staff_requests where status = 'pending'",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function emailTaken(email: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "select id from staff where lower(email) = lower($1) limit 1",
    [email.trim()],
  );
  return rows.length > 0;
}

export type CreateJoinRequestResult =
  | { ok: true }
  | { ok: false; reason: "exists" | "duplicate" | "failed" };

export async function createJoinRequest(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
  passwordHash: string;
}): Promise<CreateJoinRequestResult> {
  if (await emailTaken(input.email)) return { ok: false, reason: "exists" };

  try {
    await query(
      `insert into staff_requests (name, email, phone, message, password_hash)
       values ($1, lower($2), $3, $4, $5)`,
      [input.name.trim(), input.email.trim(), input.phone.trim(), input.message.trim(), input.passwordHash],
    );
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate key")) return { ok: false, reason: "duplicate" };
    console.error("could not create join request:", error);
    return { ok: false, reason: "failed" };
  }
}

export type ReviewJoinRequestResult =
  | { ok: true; name: string; email: string }
  | { ok: false; reason: "not-found" | "exists" | "failed" };

/**
 * Approving creates the account with the password hash captured at request
 * time, then closes the request. Only a still-pending request can be approved,
 * so two admins racing each other cannot create the account twice.
 */
export async function approveJoinRequest(input: {
  requestId: string;
  role: Role;
  reviewerId: string;
}): Promise<ReviewJoinRequestResult> {
  const rows = await query<{ name: string; email: string; password_hash: string }>(
    `select name, email, password_hash from staff_requests where id = $1 and status = 'pending' limit 1`,
    [input.requestId],
  );
  const request = rows[0];
  if (!request) return { ok: false, reason: "not-found" };

  if (await emailTaken(request.email)) return { ok: false, reason: "exists" };

  try {
    await createStaffWithHash({
      name: request.name,
      email: request.email,
      passwordHash: request.password_hash,
      role: input.role,
    });
  } catch (error) {
    console.error("could not create account from join request:", error);
    return { ok: false, reason: "failed" };
  }

  await query(
    `update staff_requests
     set status = 'approved', reviewed_at = now(), reviewed_by = $2
     where id = $1 and status = 'pending'`,
    [input.requestId, input.reviewerId],
  );

  return { ok: true, name: request.name, email: request.email };
}

export async function rejectJoinRequest(input: {
  requestId: string;
  reviewerId: string;
}): Promise<{ ok: boolean; name?: string }> {
  const rows = await query<{ name: string }>(
    `update staff_requests
     set status = 'rejected', reviewed_at = now(), reviewed_by = $2
     where id = $1 and status = 'pending'
     returning name`,
    [input.requestId, input.reviewerId],
  );
  return { ok: rows.length > 0, name: rows[0]?.name };
}
