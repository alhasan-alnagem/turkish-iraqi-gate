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

async function init(): Promise<Queryable> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { default: postgres } = await import("postgres");
    const conn = postgres(url, {
      max: 5,
      idle_timeout: 20,
      // Required when the database sits behind a transaction pooler.
      prepare: false,
    });
    await conn.unsafe(SCHEMA);
    return {
      async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
        const rows = await conn.unsafe(text, params as never[]);
        return rows as unknown as T[];
      },
    };
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

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
