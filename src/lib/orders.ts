import "server-only";

import { query } from "@/lib/db";
import { ensureBootstrapAdmin } from "@/lib/staff";
import { notify } from "@/lib/notifications";
import { OPEN_STATUSES, statusLabel, type OrderStatus } from "@/lib/order-status";

export type Order = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  city: string;
  product: string;
  quantity: string;
  budget: string;
  currency: string;
  shipping: boolean;
  details: string;
  lang: string;
  status: OrderStatus;
  assigned_to: string | null;
  assigned_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  status: OrderStatus | null;
  note: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
};

const ORDER_COLUMNS = `
  o.id, o.ref, o.name, o.phone, o.city, o.product, o.quantity, o.budget, o.currency,
  o.shipping, o.details, o.lang, o.status, o.assigned_to, o.source, o.created_at, o.updated_at,
  s.name as assigned_name
`;

const ORDER_JOIN = "from orders o left join staff s on s.id = o.assigned_to";

/** Normalises a phone number so 0780… / +964 780… compare equal. */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.replace(/^00/, "").replace(/^964/, "").replace(/^0+/, "");
}

async function nextRef(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await query<{ next: number }>(
    `select coalesce(max(nullif(split_part(ref, '-', 3), '')::int), 0) + 1 as next
     from orders where ref like $1`,
    [`TIG-${year}-%`],
  );
  const next = Number(rows[0]?.next ?? 1);
  return `TIG-${year}-${String(next).padStart(4, "0")}`;
}

export type NewOrderInput = {
  name: string;
  phone: string;
  city?: string;
  product?: string;
  quantity?: string;
  budget?: string;
  currency?: string;
  shipping?: boolean;
  details?: string;
  lang?: string;
  source?: string;
  createdAt?: string;
  /** First timeline entry. Defaults to the website wording. */
  eventNote?: string;
  actorId?: string | null;
  actorName?: string | null;
};

/** Creates an order and its first timeline entry. */
export async function createOrder(input: NewOrderInput): Promise<Order> {
  let lastError: unknown = null;

  // Ref generation races on concurrent submissions; retry a couple of times
  // before giving up — the unique index is the real guard.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ref = await nextRef();
    try {
      const rows = await query<{ id: string }>(
        `insert into orders (ref, name, phone, city, product, quantity, budget, currency,
                             shipping, details, lang, source, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, coalesce($13::timestamptz, now()))
         returning id`,
        [
          ref,
          input.name.trim(),
          input.phone.trim(),
          input.city ?? "",
          input.product ?? "",
          input.quantity ?? "",
          input.budget ?? "",
          (input.currency ?? "USD").toUpperCase(),
          Boolean(input.shipping),
          input.details ?? "",
          input.lang ?? "",
          input.source ?? "website",
          input.createdAt ?? null,
        ],
      );

      const order = await getOrder(rows[0].id);
      await addEvent(
        rows[0].id,
        "received",
        input.eventNote ?? "Order received from the website",
        input.actorId ?? null,
        input.actorName ?? null,
      );
      await notify({
        kind: "order_created",
        summary: `New order ${ref} — ${input.name}`,
        orderId: rows[0].id,
        orderRef: ref,
        actorId: input.actorId ?? null,
        actorName:
          input.actorName ??
          (input.source === "website"
            ? "Website"
            : input.source === "sheet-import"
              ? "Sheet import"
              : null),
      });
      return order!;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("duplicate key")) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not create the order.");
}

export async function getOrder(id: string): Promise<Order | null> {
  const rows = await query<Order>(`select ${ORDER_COLUMNS} ${ORDER_JOIN} where o.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getOrderByRef(ref: string): Promise<Order | null> {
  const rows = await query<Order>(`select ${ORDER_COLUMNS} ${ORDER_JOIN} where upper(o.ref) = upper($1)`, [
    ref.trim(),
  ]);
  return rows[0] ?? null;
}

export type OrderFilters = {
  status?: OrderStatus | "open" | "all";
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listOrders(filters: OrderFilters = {}): Promise<{ orders: Order[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];

  const status = filters.status ?? "open";
  if (status === "open") {
    params.push([...OPEN_STATUSES]);
    where.push(`o.status = any($${params.length})`);
  } else if (status !== "all") {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }

  if (filters.assignedTo) {
    params.push(filters.assignedTo);
    where.push(`o.assigned_to = $${params.length}`);
  }

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    const i = params.length;
    where.push(`(o.ref ilike $${i} or o.name ilike $${i} or o.phone ilike $${i} or o.product ilike $${i})`);
  }

  const clause = where.length ? `where ${where.join(" and ")}` : "";
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;

  const totalRows = await query<{ count: string }>(
    `select count(*)::text as count from orders o ${clause}`,
    params,
  );

  params.push(limit, offset);
  const orders = await query<Order>(
    `select ${ORDER_COLUMNS} ${ORDER_JOIN} ${clause}
     order by o.created_at desc limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return { orders, total: Number(totalRows[0]?.count ?? 0) };
}

export async function getTimeline(orderId: string): Promise<OrderEvent[]> {
  return query<OrderEvent>(
    `select id, order_id, status, note, actor_id, actor_name, created_at
     from order_events where order_id = $1 order by created_at asc`,
    [orderId],
  );
}

export async function addEvent(
  orderId: string,
  status: OrderStatus | null,
  note: string | null,
  actorId: string | null,
  actorName: string | null,
): Promise<void> {
  await query(
    `insert into order_events (order_id, status, note, actor_id, actor_name)
     values ($1, $2, $3, $4, $5)`,
    [orderId, status, note, actorId, actorName],
  );
}

export async function setStatus(
  orderId: string,
  status: OrderStatus,
  actorId: string,
  actorName: string,
  note?: string,
): Promise<void> {
  const rows = await query<{ ref: string }>(
    "update orders set status = $2, updated_at = now() where id = $1 returning ref",
    [orderId, status],
  );
  await addEvent(orderId, status, note?.trim() || null, actorId, actorName);
  await notify({
    kind: "status_changed",
    summary: `${rows[0]?.ref ?? "Order"} moved to ${statusLabel(status)}`,
    orderId,
    orderRef: rows[0]?.ref ?? "",
    actorId,
    actorName,
  });
}

export async function assignOrder(
  orderId: string,
  staffId: string | null,
  actorId: string,
  actorName: string,
  assigneeName?: string | null,
): Promise<void> {
  const rows = await query<{ ref: string }>(
    "update orders set assigned_to = $2, updated_at = now() where id = $1 returning ref",
    [orderId, staffId],
  );
  await addEvent(
    orderId,
    null,
    staffId ? `Assigned to ${assigneeName ?? "a team member"}` : "Unassigned",
    actorId,
    actorName,
  );
  await notify({
    kind: "assigned",
    summary: staffId
      ? `${rows[0]?.ref ?? "Order"} assigned to ${assigneeName ?? "a team member"}`
      : `${rows[0]?.ref ?? "Order"} unassigned`,
    orderId,
    orderRef: rows[0]?.ref ?? "",
    actorId,
    actorName,
  });
}

export async function addNote(
  orderId: string,
  note: string,
  actorId: string,
  actorName: string,
): Promise<void> {
  await addEvent(orderId, null, note.trim(), actorId, actorName);
}

/** Removes an order; its timeline goes with it (on delete cascade). */
export async function deleteOrder(
  orderId: string,
  actorId: string | null = null,
  actorName: string | null = null,
): Promise<void> {
  const rows = await query<{ ref: string; name: string }>(
    "delete from orders where id = $1 returning ref, name",
    [orderId],
  );
  const removed = rows[0];
  if (removed) {
    await notify({
      kind: "deleted",
      summary: `${removed.ref} deleted (customer ${removed.name})`,
      orderRef: removed.ref,
      actorId,
      actorName,
    });
  }
}

export async function queueCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    "select status, count(*)::text as count from orders group by status",
  );
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}

export type Analytics = {
  total: number;
  open: number;
  delivered: number;
  cancelled: number;
  conversionRate: number;
  monthly: { month: string; orders: number; delivered: number }[];
  topCities: { city: string; orders: number }[];
  perStaff: { name: string; open: number; total: number }[];
  avgDaysToDeliver: number | null;
};

export async function analytics(): Promise<Analytics> {
  const counts = await queueCounts();
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const delivered = counts.delivered ?? 0;
  const cancelled = counts.cancelled ?? 0;
  const open = OPEN_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

  const monthly = await query<{ month: string; orders: string; delivered: string }>(
    `select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
            count(*)::text as orders,
            count(*) filter (where status = 'delivered')::text as delivered
     from orders
     where created_at > now() - interval '12 months'
     group by 1 order by 1`,
  );

  const topCities = await query<{ city: string; orders: string }>(
    `select coalesce(nullif(city, ''), '—') as city, count(*)::text as orders
     from orders group by 1 order by count(*) desc limit 8`,
  );

  const perStaff = await query<{ name: string; open: string; total: string }>(
    `select s.name,
            count(*) filter (where o.status = any($1))::text as open,
            count(*)::text as total
     from staff s join orders o on o.assigned_to = s.id
     group by s.name order by count(*) desc limit 10`,
    [[...OPEN_STATUSES]],
  );

  const avg = await query<{ days: string | null }>(
    `select avg(extract(epoch from (e.created_at - o.created_at)) / 86400)::text as days
     from orders o
     join lateral (
       select created_at from order_events
       where order_id = o.id and status = 'delivered'
       order by created_at asc limit 1
     ) e on true`,
  );

  return {
    total,
    open,
    delivered,
    cancelled,
    conversionRate: total ? Math.round(((total - cancelled) / total) * 100) : 0,
    monthly: monthly.map((row) => ({
      month: row.month,
      orders: Number(row.orders),
      delivered: Number(row.delivered),
    })),
    topCities: topCities.map((row) => ({ city: row.city, orders: Number(row.orders) })),
    perStaff: perStaff.map((row) => ({
      name: row.name,
      open: Number(row.open),
      total: Number(row.total),
    })),
    avgDaysToDeliver: avg[0]?.days ? Math.round(Number(avg[0].days) * 10) / 10 : null,
  };
}

/** Called once per request that needs the schema seeded. */
export async function ensureOrdersReady(): Promise<void> {
  await ensureBootstrapAdmin();
}
