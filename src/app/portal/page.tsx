import Link from "next/link";
import { currentStaff } from "@/lib/auth";
import { ALL_STATUSES, OPEN_STATUSES, type OrderStatus } from "@/lib/order-status";
import { analytics, listOrders, queueCounts } from "@/lib/orders";

export const dynamic = "force-dynamic";

type Search = { status?: string; q?: string; assignee?: string };

function fmtDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isStatus(value: string | undefined): value is OrderStatus {
  return Boolean(value && (ALL_STATUSES as readonly string[]).includes(value));
}

export default async function PortalDashboard({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const staff = await currentStaff();

  const statusFilter: OrderStatus | "open" | "all" = isStatus(params.status)
    ? params.status
    : params.status === "all"
      ? "all"
      : "open";

  const [{ orders, total }, counts, stats] = await Promise.all([
    listOrders({ status: statusFilter, search: params.q, limit: 100 }),
    queueCounts(),
    analytics(),
  ]);

  const awaitingPrice = (counts.received ?? 0) + (counts.quoted ?? 0);

  const filters: { key: string; label: string; count?: number }[] = [
    { key: "open", label: "Open", count: OPEN_STATUSES.reduce((s, k) => s + (counts[k] ?? 0), 0) },
    { key: "all", label: "All", count: stats.total },
    ...OPEN_STATUSES.map((status) => ({ key: status, label: status, count: counts[status] ?? 0 })),
    { key: "delivered", label: "delivered", count: counts.delivered ?? 0 },
    { key: "cancelled", label: "cancelled", count: counts.cancelled ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Awaiting finalisation
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">{awaitingPrice}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">received or quoted, no decision yet</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Open orders</p>
          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">{stats.open}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">not delivered or cancelled</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Delivered</p>
          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">{stats.delivered}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {stats.avgDaysToDeliver !== null
              ? `avg ${stats.avgDaysToDeliver} days door to door`
              : "no deliveries recorded yet"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Total orders</p>
          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">{stats.total}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{stats.cancelled} cancelled</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <h1 className="text-lg font-bold text-[var(--primary)]">Orders</h1>

          <div className="flex flex-wrap items-center gap-2">
            <form className="flex items-center gap-2" action="/portal">
              {statusFilter !== "open" ? (
                <input type="hidden" name="status" value={statusFilter} />
              ) : null}
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Reference, name, phone, product…"
                className="w-64 rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white"
              >
                Search
              </button>
            </form>

            <Link
              href="/portal/orders/new"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-light)]"
            >
              + New order
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
          {filters.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <Link
                key={filter.key}
                href={`/portal?status=${filter.key}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                {filter.label.replace(/_/g, " ")}
                {filter.count !== undefined ? ` (${filter.count})` : ""}
              </Link>
            );
          })}
        </div>

        {orders.length === 0 ? (
          <p className="p-10 text-center text-sm text-[var(--muted)]">No orders match this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--section)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Ref</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Assigned</th>
                  <th className="px-5 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[var(--section)]">
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link href={`/portal/orders/${order.id}`} className="text-[var(--accent)] hover:underline">
                        {order.ref}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/portal/orders/${order.id}`} className="font-medium hover:underline">
                        {order.name}
                      </Link>
                      <span className="block text-xs text-[var(--muted)]">
                        {order.city || "—"}
                      </span>
                    </td>
                    <td className="max-w-[18rem] truncate px-5 py-3">{order.product || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-[var(--section)] px-2.5 py-1 text-xs font-medium capitalize">
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">{order.assigned_name ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-[var(--muted)]">
                      {fmtDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]">
          Showing {orders.length} of {total} · signed in as {staff?.name}
        </p>
      </section>
    </div>
  );
}
