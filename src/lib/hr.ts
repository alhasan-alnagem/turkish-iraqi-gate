import "server-only";

import { query } from "@/lib/db";
import type { Role } from "@/lib/staff";

/**
 * HR records for the TIGIP team.
 *
 * The employee file hangs off the existing `staff` row, so a person has one
 * identity for orders and for HR. Leave requests are their own table and are
 * decided by an administrator; the requester always sees their own history.
 */

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "commission"
  | "intern";

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
  "commission",
  "intern",
];

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  commission: "Commission based",
  intern: "Intern",
};

export type LeaveKind = "annual" | "sick" | "unpaid" | "other";

export const LEAVE_KINDS: readonly LeaveKind[] = ["annual", "sick", "unpaid", "other"];

export const LEAVE_LABELS: Record<LeaveKind, string> = {
  annual: "Annual leave",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
  other: "Other",
};

export type LeaveStatus = "pending" | "approved" | "rejected";

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function isEmploymentType(value: string): value is EmploymentType {
  return (EMPLOYMENT_TYPES as readonly string[]).includes(value);
}

export function isLeaveKind(value: string): value is LeaveKind {
  return (LEAVE_KINDS as readonly string[]).includes(value);
}

export type HrProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  job_title: string;
  department: string;
  phone: string;
  hired_on: string | null;
  employment_type: EmploymentType;
  annual_leave_days: number;
  notes: string;
  created_at: string;
};

export type LeaveRequest = {
  id: string;
  staff_id: string;
  staff_name: string;
  kind: LeaveKind;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  review_note: string;
};

const PROFILE_COLUMNS = `
  id, name, email, role, active, job_title, department, phone,
  to_char(hired_on, 'YYYY-MM-DD') as hired_on,
  employment_type, annual_leave_days, notes, created_at
`;

const LEAVE_COLUMNS = `
  l.id, l.staff_id, p.name as staff_name, l.kind,
  to_char(l.start_date, 'YYYY-MM-DD') as start_date,
  to_char(l.end_date, 'YYYY-MM-DD') as end_date,
  l.days, l.reason, l.status, l.created_at, l.reviewed_at,
  r.name as reviewed_by_name, l.review_note
`;

const LEAVE_JOIN = `
  from leave_requests l
  join staff p on p.id = l.staff_id
  left join staff r on r.id = l.reviewed_by
`;

/* --------------------------------- profiles -------------------------------- */

export async function listTeamHr(): Promise<HrProfile[]> {
  return query<HrProfile>(
    `select ${PROFILE_COLUMNS} from staff order by active desc, department, name`,
  );
}

export async function getHrProfile(id: string): Promise<HrProfile | null> {
  const rows = await query<HrProfile>(`select ${PROFILE_COLUMNS} from staff where id = $1 limit 1`, [id]);
  return rows[0] ?? null;
}

export async function updateHrProfile(
  id: string,
  patch: {
    jobTitle?: string;
    department?: string;
    phone?: string;
    hiredOn?: string | null;
    employmentType?: EmploymentType;
    annualLeaveDays?: number;
    notes?: string;
  },
): Promise<HrProfile | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.jobTitle !== undefined) {
    params.push(patch.jobTitle.trim());
    sets.push(`job_title = $${params.length}`);
  }
  if (patch.department !== undefined) {
    params.push(patch.department.trim());
    sets.push(`department = $${params.length}`);
  }
  if (patch.phone !== undefined) {
    params.push(patch.phone.trim());
    sets.push(`phone = $${params.length}`);
  }
  if (patch.hiredOn !== undefined) {
    params.push(patch.hiredOn || null);
    sets.push(`hired_on = $${params.length}::date`);
  }
  if (patch.employmentType !== undefined) {
    params.push(patch.employmentType);
    sets.push(`employment_type = $${params.length}`);
  }
  if (patch.annualLeaveDays !== undefined) {
    params.push(Math.max(0, Math.min(120, Math.round(patch.annualLeaveDays))));
    sets.push(`annual_leave_days = $${params.length}`);
  }
  if (patch.notes !== undefined) {
    params.push(patch.notes.trim().slice(0, 2000));
    sets.push(`notes = $${params.length}`);
  }

  if (!sets.length) return getHrProfile(id);

  params.push(id);
  const rows = await query<HrProfile>(
    `update staff set ${sets.join(", ")} where id = $${params.length} returning ${PROFILE_COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

/* ----------------------------------- leave --------------------------------- */

/** Inclusive day count between two ISO dates (Friday and Monday = 4 days). */
export function countDays(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type RequestLeaveResult =
  | { ok: true; days: number }
  | { ok: false; reason: "invalid" | "too-long" | "failed" };

export async function requestLeave(input: {
  staffId: string;
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<RequestLeaveResult> {
  if (!ISO_DATE.test(input.startDate) || !ISO_DATE.test(input.endDate)) {
    return { ok: false, reason: "invalid" };
  }

  const days = countDays(input.startDate, input.endDate);
  if (days < 1) return { ok: false, reason: "invalid" };
  // A request longer than two months is a data-entry mistake, not leave.
  if (days > 62) return { ok: false, reason: "too-long" };

  try {
    await query(
      `insert into leave_requests (staff_id, kind, start_date, end_date, days, reason)
       values ($1, $2, $3::date, $4::date, $5, $6)`,
      [input.staffId, input.kind, input.startDate, input.endDate, days, input.reason.trim().slice(0, 1000)],
    );
    return { ok: true, days };
  } catch (error) {
    console.error("could not record leave request:", error);
    return { ok: false, reason: "failed" };
  }
}

export async function listLeaveRequests(filters: {
  staffId?: string;
  status?: LeaveStatus;
  limit?: number;
} = {}): Promise<LeaveRequest[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.staffId) {
    params.push(filters.staffId);
    where.push(`l.staff_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`l.status = $${params.length}`);
  }

  params.push(Math.min(filters.limit ?? 100, 200));

  return query<LeaveRequest>(
    `select ${LEAVE_COLUMNS} ${LEAVE_JOIN}
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by l.created_at desc limit $${params.length}`,
    params,
  );
}

export async function decideLeaveRequest(input: {
  id: string;
  decision: "approved" | "rejected";
  reviewerId: string;
  note?: string;
}): Promise<LeaveRequest | null> {
  const updated = await query<{ id: string }>(
    `update leave_requests
     set status = $2, reviewed_at = now(), reviewed_by = $3, review_note = $4
     where id = $1 and status = 'pending'
     returning id`,
    [input.id, input.decision, input.reviewerId, input.note?.trim().slice(0, 500) ?? ""],
  );

  if (!updated[0]) return null;

  const rows = await query<LeaveRequest>(
    `select ${LEAVE_COLUMNS} ${LEAVE_JOIN} where l.id = $1 limit 1`,
    [updated[0].id],
  );
  return rows[0] ?? null;
}

/* ---------------------------------- summary -------------------------------- */

export type HrSummary = {
  headcount: number;
  departments: number;
  pendingLeave: number;
  onLeaveToday: number;
  pendingJoinRequests: number;
};

export async function hrSummary(): Promise<HrSummary> {
  const rows = await query<Record<string, string>>(
    `select
       (select count(*) from staff where active)::text as headcount,
       (select count(distinct department) from staff where active and department <> '')::text as departments,
       (select count(*) from leave_requests where status = 'pending')::text as pending_leave,
       (select count(*) from leave_requests
          where status = 'approved' and current_date between start_date and end_date)::text as on_leave_today,
       (select count(*) from staff_requests where status = 'pending')::text as pending_join_requests`,
  );

  const row = rows[0] ?? {};
  return {
    headcount: Number(row.headcount ?? 0),
    departments: Number(row.departments ?? 0),
    pendingLeave: Number(row.pending_leave ?? 0),
    onLeaveToday: Number(row.on_leave_today ?? 0),
    pendingJoinRequests: Number(row.pending_join_requests ?? 0),
  };
}

/** Annual entitlement minus approved annual leave taken this calendar year. */
export function leaveBalance(
  profile: Pick<HrProfile, "annual_leave_days">,
  requests: Pick<LeaveRequest, "kind" | "status" | "days" | "start_date">[],
): { used: number; remaining: number } {
  const year = new Date().getFullYear();
  const used = requests
    .filter(
      (request) =>
        request.kind === "annual" &&
        request.status === "approved" &&
        request.start_date.startsWith(String(year)),
    )
    .reduce((total, request) => total + Number(request.days), 0);

  return { used, remaining: Math.max(0, Number(profile.annual_leave_days) - used) };
}

export function listOnLeaveToday(): Promise<Array<{ name: string; kind: LeaveKind; end_date: string }>> {
  return query<{ name: string; kind: LeaveKind; end_date: string }>(
    `select p.name, l.kind, to_char(l.end_date, 'YYYY-MM-DD') as end_date
     from leave_requests l
     join staff p on p.id = l.staff_id
     where l.status = 'approved' and current_date between l.start_date and l.end_date
     order by l.end_date, p.name`,
  );
}
