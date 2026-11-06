import "server-only";

/**
 * One tiny portable query layer.
 *
 * - Production (Vercel): `DATABASE_URL` points at Postgres (Neon / Vercel
 *   Postgres) and we talk to it with `postgres`.
 * - Local development: with no `DATABASE_URL` we fall back to PGlite, an
 *   embedded Postgres compiled to WebAssembly, persisted in `.pglite/`. Same
 *   SQL, no server to install, so the portal can be developed and tested
 *   without provisioning anything.
 *
 * Queries are written as plain SQL with $1 placeholders so both drivers behave
 * identically.
 */

export type Row = Record<string, unknown>;

type Queryable = {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
};

const SCHEMA = `
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'staff' check (role in ('admin', 'coordinator', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Existing databases were created with a two-role check; widen it in place.
alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check check (role in ('admin', 'coordinator', 'staff'));
alter table staff add column if not exists notifications_seen_at timestamptz;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  name text not null,
  phone text not null,
  country_code text not null default '964',
  city text default '',
  product text default '',
  quantity text default '',
  budget text default '',
  currency text not null default 'USD',
  shipping boolean not null default false,
  details text default '',
  lang text default '',
  status text not null default 'received',
  assigned_to uuid references staff(id) on delete set null,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_phone_idx on orders (phone);
create index if not exists orders_assigned_idx on orders (assigned_to);

-- Numbers created before the country code existed are all Iraqi.
alter table orders add column if not exists country_code text not null default '964';

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text,
  note text,
  actor_id uuid references staff(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on order_events (order_id, created_at desc);

-- Team-wide activity feed. Deliberately no foreign key to orders: the entry
-- must survive the order being deleted.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  order_ref text not null default '',
  kind text not null,
  summary text not null,
  actor_id uuid,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_idx on notifications (created_at desc);

-- HR records live on the staff row: the account and the employee file are the
-- same person, so splitting them would only create orphans.
alter table staff add column if not exists job_title text not null default '';
alter table staff add column if not exists department text not null default '';
alter table staff add column if not exists phone text not null default '';
alter table staff add column if not exists hired_on date;
alter table staff add column if not exists employment_type text not null default 'full_time';
alter table staff add column if not exists annual_leave_days integer not null default 21;
alter table staff add column if not exists notes text not null default '';

-- Public "register as an employee" form. The password is hashed at request
-- time, so approving creates the account without ever re-handling a password.
create table if not exists staff_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null default '',
  password_hash text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references staff(id) on delete set null,
  constraint staff_requests_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists staff_requests_status_idx on staff_requests (status, created_at desc);

-- Only one open request per email, no matter how many times the form is sent.
create unique index if not exists staff_requests_pending_email_idx
  on staff_requests (lower(email)) where status = 'pending';

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  kind text not null default 'annual',
  start_date date not null,
  end_date date not null,
  days integer not null default 1,
  reason text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references staff(id) on delete set null,
  review_note text not null default '',
  constraint leave_requests_kind_check check (kind in ('annual', 'sick', 'unpaid', 'other')),
  constraint leave_requests_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists leave_requests_staff_idx on leave_requests (staff_id, created_at desc);
create index if not exists leave_requests_status_idx on leave_requests (status, created_at desc);

-- Job applications from the public /career form. The CV was previously only
-- emailed; it is now stored with the application so nothing is lost when the
-- mailbox misses a message. The PDF lives in its own table so list queries
-- never drag megabytes around.
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  position text not null,
  message text not null default '',
  lang text not null default 'en',
  cv_name text not null default '',
  cv_type text not null default 'application/pdf',
  cv_size integer not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references staff(id) on delete set null,
  review_note text not null default '',
  constraint job_applications_status_check
    check (status in ('new', 'shortlisted', 'interview', 'hired', 'rejected'))
);

create index if not exists job_applications_status_idx on job_applications (status, created_at desc);
create index if not exists job_applications_created_idx on job_applications (created_at desc);

-- Interview tracker + the language(s) the applicant was answered in, so the
-- automatic reply is auditable. The create-table above never alters an existing
-- table, so new columns are added in place.
alter table job_applications add column if not exists interview_at timestamptz;
alter table job_applications add column if not exists interview_mode text not null default '';
alter table job_applications add column if not exists interview_note text not null default '';
alter table job_applications add column if not exists decision_langs text not null default '';
alter table job_applications add column if not exists decided_at timestamptz;

create index if not exists job_applications_interview_idx
  on job_applications (interview_at) where interview_at is not null;

create table if not exists job_application_files (
  application_id uuid primary key references job_applications(id) on delete cascade,
  data bytea not null
);
`;

/**
 * The connection string can arrive under several names depending on how the
 * database was attached to the Vercel project (Vercel Postgres, the Neon
 * integration, or a manual Neon string).
 */
const URL_VARS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "NEON_DATABASE_URL",
] as const;

export const DATABASE_VARS = URL_VARS;

export class DatabaseConfigError extends Error {}

function rawConnectionVar(): { name: string; value: string } | null {
  for (const name of URL_VARS) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

/** A pasted docs example ("postgres://user:pass@host/db…") is not a URL. */
function looksMasked(value: string): boolean {
  return /…|%E2%80%A6|\.\.\./.test(value) || /[<>]/.test(value);
}

function connectionString(): string | null {
  const raw = rawConnectionVar();
  if (!raw || looksMasked(raw.value)) return null;
  return /^postgres(ql)?:\/\//i.test(raw.value) ? raw.value : null;
}

/** Plain-language explanation of why the connection string is unusable. */
export function databaseVariableProblem(): string | null {
  const raw = rawConnectionVar();

  if (!raw) {
    return process.env.VERCEL
      ? "No Postgres connection string is set for this deployment."
      : null;
  }

  if (looksMasked(raw.value)) {
    return `${raw.name} is a shortened example — it still contains "…". Paste the full connection string copied from the database dashboard.`;
  }

  if (!/^postgres(ql)?:\/\//i.test(raw.value)) {
    return `${raw.name} does not start with postgresql:// — it should be the whole connection string, not one part of it.`;
  }

  return null;
}

/** Env-var names present in this deployment. Names only — never values. */
export function databaseEnvPresence(): { name: string; present: boolean }[] {
  return URL_VARS.map((name) => ({ name, present: Boolean(process.env[name]?.trim()) }));
}

/** Removes anything that looks like a credential or a host before showing it. */
export function safeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "unknown error");
  return raw
    .replace(/postgres(ql)?:\/\/\S+/gi, "postgres://…")
    .replace(/(password|pass|pwd)=[^\s&]+/gi, "$1=…")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

async function init(): Promise<Queryable> {
  const url = connectionString();

  if (url) {
    const { default: postgres } = await import("postgres");
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
    const sslSpecified = /[?&]ssl(mode)?=/i.test(url);
    const conn = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      // Required when the database sits behind a transaction pooler.
      prepare: false,
      // Managed Postgres (Neon, Vercel Postgres, Supabase) refuses plaintext
      // connections; the driver does not infer that from the host.
      ...(sslSpecified ? {} : { ssl: isLocal ? false : ("require" as const) }),
    });
    await conn.unsafe(SCHEMA);
    return {
      async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
        const rows = await conn.unsafe(text, params as never[]);
        return rows as unknown as T[];
      },
    };
  }

  // Vercel's filesystem is read-only, so the embedded fallback would fail with
  // an unrelated-looking error. Say what is actually wrong instead.
  if (process.env.VERCEL) {
    throw new DatabaseConfigError(
      databaseVariableProblem() ??
        "No database connection string is set for this deployment. Add DATABASE_URL (or attach a Postgres/Neon store) in Vercel for both Preview and Production.",
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  await db.waitReady;
  await db.exec(SCHEMA);
  return {
    async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
      const result = await db.query(text, params);
      return result.rows as unknown as T[];
    },
  };
}

// Cached on globalThis so Next's dev-mode module reloading never opens a second
// handle to the same PGlite directory.
const globalCache = globalThis as unknown as { __tigipDb?: Promise<Queryable> };

export function database(): Promise<Queryable> {
  if (!globalCache.__tigipDb) {
    globalCache.__tigipDb = init().catch((error) => {
      globalCache.__tigipDb = undefined;
      throw error;
    });
  }
  return globalCache.__tigipDb;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await database();
  return db.query<T>(text, params);
}

/** Name of the env var this deployment is attempting to use, or null. */
export function databaseVariableName(): string | null {
  return rawConnectionVar()?.name ?? null;
}

/** Cheap probe used by the sign-in page to explain a broken setup. */
export async function databaseHealth(): Promise<{ ok: boolean; reason: string | null }> {
  const problem = databaseVariableProblem();
  if (problem) return { ok: false, reason: problem };

  try {
    // Also creates the schema on first use, so a bad permission shows up here
    // rather than halfway through the first order.
    await query("select 1");
    return { ok: true, reason: null };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof DatabaseConfigError ? error.message : safeErrorMessage(error),
    };
  }
}

export function databaseConfigured(): boolean {
  return connectionString() !== null;
}
