import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_STATUSES, statusLabel } from "@/lib/order-status";
import { getOrder, getTimeline, normalisePhone } from "@/lib/orders";
import { sheetMirrorConfigured } from "@/lib/sheet-mirror";
import { listActiveStaff } from "@/lib/staff";
import { assignAction, changeStatusAction, noteAction, sendToSheetAction } from "../../actions";

export const dynamic = "force-dynamic";

function fmt(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sheet?: string }>;
}) {
  const [{ id }, { sheet }] = await Promise.all([params, searchParams]);
  const order = await getOrder(id);
  if (!order) notFound();

  const [timeline, staff] = await Promise.all([getTimeline(id), listActiveStaff()]);
  const whatsapp = `https://wa.me/${normalisePhone(order.phone) ? `964${normalisePhone(order.phone)}` : ""}`;
  const sheetReady = sheetMirrorConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/portal" className="text-sm text-[var(--accent)] hover:underline">
            ← All orders
          </Link>
          <h1 className="mt-1 font-mono text-xl font-bold text-[var(--primary)]">{order.ref}</h1>
          <p className="text-sm text-[var(--muted)]">
            {order.name} · received {fmt(order.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--section)] px-3 py-1.5 text-sm font-medium capitalize">
            {statusLabel(order.status)}
          </span>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      {sheet === "sent" ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Copy sent to the Google Sheet.
        </p>
      ) : sheet === "failed" ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          The Google Sheet copy could not be written. Check that{" "}
          <code className="font-mono">GOOGLE_SHEETS_URL</code> is set and that the Apps Script
          deployment is still live, then try again.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Request
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Customer", order.name],
                ["Phone", order.phone],
                ["City", order.city || "—"],
                ["Shipping needed", order.shipping ? "Yes" : "No"],
                ["Product", order.product || "—"],
                ["Quantity", order.quantity || "—"],
                ["Budget", order.budget ? `${order.budget} ${order.currency}` : "—"],
                ["Language", order.lang || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {order.details ? (
              <div className="mt-4 rounded-lg bg-[var(--section)] p-3 text-sm whitespace-pre-wrap">
                {order.details}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Timeline
            </h2>
            <ol className="mt-4 space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-medium">
                      {event.status ? statusLabel(event.status) : "Note"}
                      {event.actor_name ? (
                        <span className="font-normal text-[var(--muted)]"> · {event.actor_name}</span>
                      ) : null}
                    </p>
                    {event.note ? (
                      <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">{event.note}</p>
                    ) : null}
                    <p className="text-xs text-[var(--muted)]">{fmt(event.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Move this order
            </h2>
            <form action={changeStatusAction} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <textarea
                name="note"
                rows={2}
                placeholder="Optional note for the customer timeline"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
              >
                Update status
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Assigned to
            </h2>
            <form action={assignAction} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="staffId"
                defaultValue={order.assigned_to ?? "none"}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <option value="none">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--section)]"
              >
                Save assignment
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Internal note
            </h2>
            <form action={noteAction} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="note"
                rows={3}
                required
                placeholder="Factory contact, price agreed, documents…"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--section)]"
              >
                Add note
              </button>
            </form>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Notes appear on the internal timeline only. Customers see status changes.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Google Sheet
            </h2>
            {sheetReady ? (
              <>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  New orders are copied automatically. Use this if the row is missing or the
                  spreadsheet was edited.
                </p>
                <form action={sendToSheetAction} className="mt-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--section)]"
                  >
                    Send to sheet
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Not configured — <code className="font-mono">GOOGLE_SHEETS_URL</code> is unset in
                this deployment, so the order lives only in the portal.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
