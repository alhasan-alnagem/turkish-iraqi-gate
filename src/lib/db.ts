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
  role text not null default 'staff' check (role in ('admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  name text not null,
  phone text not null,
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

function connectionString(): string | null {
  for (const name of URL_VARS) {
    const value = process.env[name]?.trim();
    if (value && /^postgres(ql)?:\/\//i.test(value)) return value;
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

/** Name of the env var this deployment is actually using, or null. */
export function databaseVariableName(): string | null {
  return URL_VARS.find((name) => {
    const value = process.env[name]?.trim();
    return Boolean(value && /^postgres(ql)?:\/\//i.test(value));
  }) ?? null;
}

/** Cheap probe used by the sign-in page to explain a broken setup. */
export async function databaseHealth(): Promise<{ ok: boolean; reason: string | null }> {
  if (!connectionString() && process.env.VERCEL) {
    return { ok: false, reason: "No Postgres connection string is set for this deployment." };
  }

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
