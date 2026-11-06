import "server-only";

import { query } from "@/lib/db";

/**
 * Job applications from the public /career form.
 *
 * The PDF is stored next to the application (in `job_application_files`) rather
 * than being kept only as an email attachment, so the portal is the source of
 * truth: an admin can open any CV even if a message was lost or deleted. Bytes
 * are only read one application at a time, which is why they live in a separate
 * table — the list query stays small.
 */

export type ApplicationStatus = "new" | "shortlisted" | "interview" | "hired" | "rejected";

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "new",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export type JobApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  message: string;
  lang: string;
  cv_name: string;
  cv_size: number;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  reviewed_by_name: string | null;
  review_note: string;
  interview_at: string | null;
  interview_mode: string;
  interview_note: string;
  decision_langs: string;
  decided_at: string | null;
};

const COLUMNS = `
  a.id, a.name, a.email, a.phone, a.position, a.message, a.lang,
  a.cv_name, a.cv_size, a.status, a.created_at, a.updated_at,
  s.name as reviewed_by_name, a.review_note,
  a.interview_at, a.interview_mode, a.interview_note,
  a.decision_langs, a.decided_at
`;

const JOIN = "from job_applications a left join staff s on s.id = a.reviewed_by";

export async function createJobApplication(input: {
  name: string;
  email: string;
  phone: string;
  position: string;
  message: string;
  lang: string;
  cvName: string;
  cvType: string;
  cvSize: number;
  cv: Buffer;
}): Promise<{ id: string }> {
  // Application and CV are written in one statement: either both land or none.
  const rows = await query<{ id: string }>(
    `with app as (
       insert into job_applications
         (name, email, phone, position, message, lang, cv_name, cv_type, cv_size)
       values ($1, lower($2), $3, $4, $5, $6, $7, $8, $9)
       returning id
     ), file as (
       insert into job_application_files (application_id, data)
       select id, $10 from app
     )
     select id from app`,
    [
      input.name.trim().slice(0, 160),
      input.email.trim().slice(0, 200),
      input.phone.trim().slice(0, 40),
      input.position.trim().slice(0, 160),
      input.message.trim().slice(0, 4000),
      input.lang.trim().slice(0, 8) || "en",
      input.cvName.trim().slice(0, 200),
      input.cvType.trim().slice(0, 100) || "application/pdf",
      Math.max(0, Math.round(input.cvSize)),
      input.cv,
    ],
  );

  return { id: rows[0]?.id ?? "" };
}

export async function listJobApplications(filters: {
  status?: ApplicationStatus;
  search?: string;
  limit?: number;
  /** Only applications received in the last N days (older ones drop off). */
  withinDays?: number;
} = {}): Promise<JobApplication[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`a.status = $${params.length}`);
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    where.push(
      `(a.name ilike $${params.length} or a.email ilike $${params.length} or a.position ilike $${params.length})`,
    );
  }
  if (filters.withinDays && filters.withinDays > 0) {
    params.push(Math.round(filters.withinDays));
    where.push(`a.created_at >= now() - ($${params.length} || ' days')::interval`);
  }

  params.push(Math.min(filters.limit ?? 100, 200));

  return query<JobApplication>(
    `select ${COLUMNS} ${JOIN}
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by a.created_at desc limit $${params.length}`,
    params,
  );
}

export async function getJobApplication(id: string): Promise<JobApplication | null> {
  const rows = await query<JobApplication>(
    `select ${COLUMNS} ${JOIN} where a.id = $1 limit 1`,
    [id],
  );
  return rows[0] ?? null;
}

export type ApplicationCv = { name: string; type: string; data: Uint8Array };

export async function getApplicationCv(id: string): Promise<ApplicationCv | null> {
  const rows = await query<{ cv_name: string; cv_type: string; data: Uint8Array }>(
    `select a.cv_name, a.cv_type, f.data
     from job_applications a
     join job_application_files f on f.application_id = a.id
     where a.id = $1
     limit 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    name: row.cv_name,
    type: row.cv_type || "application/pdf",
    data: row.data,
  };
}

export type ApplicationCounts = Record<ApplicationStatus | "all", number>;

export async function applicationCounts(): Promise<ApplicationCounts> {
  const rows = await query<Record<string, string>>(
    `select
       count(*)::text as all,
       count(*) filter (where status = 'new')::text as new,
       count(*) filter (where status = 'shortlisted')::text as shortlisted,
       count(*) filter (where status = 'interview')::text as interview,
       count(*) filter (where status = 'hired')::text as hired,
       count(*) filter (where status = 'rejected')::text as rejected
     from job_applications`,
  );

  const row = rows[0] ?? {};
  return {
    all: Number(row.all ?? 0),
    new: Number(row.new ?? 0),
    shortlisted: Number(row.shortlisted ?? 0),
    interview: Number(row.interview ?? 0),
    hired: Number(row.hired ?? 0),
    rejected: Number(row.rejected ?? 0),
  };
}

export async function countNewApplications(): Promise<number> {
  const rows = await query<{ count: string }>(
    "select count(*)::text as count from job_applications where status = 'new'",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function updateApplicationStatus(input: {
  id: string;
  status: ApplicationStatus;
  reviewerId: string;
  note?: string;
  /** Languages the automatic reply was written in ('' when none was sent). */
  decisionLangs?: string[];
}): Promise<JobApplication | null> {
  const langs = (input.decisionLangs ?? [])
    .map((lang) => lang.trim().toLowerCase())
    .filter(Boolean)
    .join(",")
    .slice(0, 20);

  const updated = await query<{ id: string }>(
    `update job_applications
     set status = $2,
         review_note = $3,
         reviewed_by = $4,
         decision_langs = $5,
         decided_at = case when $2 in ('hired', 'rejected') then now() else decided_at end,
         updated_at = now()
     where id = $1
     returning id`,
    [input.id, input.status, input.note?.trim().slice(0, 500) ?? "", input.reviewerId, langs],
  );
  if (!updated[0]) return null;
  return getJobApplication(updated[0].id);
}

/** Interview tracker: when, how and any note, all in one row. */
export async function setApplicationInterview(input: {
  id: string;
  at: string | null;
  mode: string;
  note: string;
  reviewerId: string;
}): Promise<JobApplication | null> {
  const updated = await query<{ id: string }>(
    `update job_applications
     set interview_at = case when $2 = '' then null else $2::timestamptz end,
         interview_mode = $3,
         interview_note = $4,
         status = case when $2 = '' then status else 'interview' end,
         reviewed_by = $5,
         updated_at = now()
     where id = $1
     returning id`,
    [
      input.id,
      input.at?.trim() ?? "",
      input.mode.trim().slice(0, 40),
      input.note.trim().slice(0, 500),
      input.reviewerId,
    ],
  );
  if (!updated[0]) return null;
  return getJobApplication(updated[0].id);
}

export type InterviewRow = Pick<
  JobApplication,
  "id" | "name" | "email" | "position" | "status" | "interview_at" | "interview_mode" | "interview_note"
> & { is_past: boolean };

/** Interviews from `daysBack` ago forwards, soonest first — the tracker list. */
export async function listInterviews(daysBack = 1): Promise<InterviewRow[]> {
  return query<InterviewRow>(
    `select a.id, a.name, a.email, a.position, a.status,
            a.interview_at, a.interview_mode, a.interview_note,
            (a.interview_at < now()) as is_past
     from job_applications a
     where a.interview_at is not null
       and a.interview_at >= now() - ($1 || ' days')::interval
     order by a.interview_at asc
     limit 50`,
    [Math.max(0, Math.round(daysBack))],
  );
}

export async function deleteJobApplication(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "delete from job_applications where id = $1 returning id",
    [id],
  );
  return rows.length > 0;
}
