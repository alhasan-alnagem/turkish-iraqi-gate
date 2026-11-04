import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { listJoinRequests } from "@/lib/staff-requests";
import { ROLES, ROLE_LABELS } from "@/lib/staff";
import { approveJoinRequestAction, rejectJoinRequestAction } from "../actions";

export const dynamic = "force-dynamic";

const ERROR: Record<string, string> = {
  "not-found": "That request is no longer pending — someone else may have reviewed it.",
  exists: "An account with that email already exists. Ask them to sign in instead.",
  failed: "Could not create the account. Try again.",
};

const fmtDateTime = (value: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

export default async function JoinRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; approved?: string; rejected?: string }>;
}) {
  const me = await currentStaff();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/portal");

  const [{ error, approved, rejected }, pending, approvedList, rejectedList] = await Promise.all([
    searchParams,
    listJoinRequests("pending"),
    listJoinRequests("approved"),
    listJoinRequests("rejected"),
  ]);

  const reviewed = [...approvedList, ...rejectedList]
    .sort(
      (a, b) =>
        new Date(b.reviewed_at ?? 0).getTime() - new Date(a.reviewed_at ?? 0).getTime(),
    )
    .slice(0, 12);

  const banner = error
    ? (ERROR[error] ?? "Something went wrong. Try again.")
    : approved
      ? "Account created. They can sign in now with the password they chose."
      : rejected
        ? "Request declined."
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">Join requests</h1>
          <p className="text-sm text-[var(--muted)]">
            People who asked to join through the public form. Pick a role to create the account.
          </p>
        </div>
        <Link href="/portal/staff" className="text-sm text-[var(--accent)] hover:underline">
          Team accounts →
        </Link>
      </div>

      {banner ? (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          }
        >
          {banner}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <h2 className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Waiting for a decision
          <span className="rounded-full bg-[var(--section)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
            {pending.length}
          </span>
        </h2>

        {pending.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">No requests waiting.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {pending.map((request) => (
              <li key={request.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-sm font-semibold">{request.name}</p>
                  <p className="text-xs text-[var(--muted)]" dir="ltr">
                    {request.email}
                    {request.phone ? ` · ${request.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Asked {fmtDateTime(request.created_at)}
                  </p>
                  {request.message ? (
                    <p className="mt-2 max-w-prose whitespace-pre-line rounded-lg bg-[var(--section)] px-3 py-2 text-sm">
                      {request.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  <form action={approveJoinRequestAction} className="flex items-center gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <select
                      name="role"
                      defaultValue="staff"
                      aria-label={`Role for ${request.name}`}
                      className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectJoinRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Recently reviewed
        </h2>
        {reviewed.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">Nothing reviewed yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {reviewed.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm">
                    {request.name} <span className="text-[var(--muted)]">· {request.email}</span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {request.reviewed_by_name ? `By ${request.reviewed_by_name} · ` : ""}
                    {fmtDateTime(request.reviewed_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    request.status === "approved"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {request.status === "approved" ? "Approved" : "Declined"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
