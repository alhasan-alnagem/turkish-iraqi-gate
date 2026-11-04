import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import {
  EMPLOYMENT_LABELS,
  LEAVE_KINDS,
  LEAVE_LABELS,
  LEAVE_STATUS_LABELS,
  getHrProfile,
  leaveBalance,
  listLeaveRequests,
  type LeaveStatus,
} from "@/lib/hr";
import { requestLeaveAction } from "../../actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

const BADGE: Record<LeaveStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const fmtDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "—";

export default async function MyHrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; requested?: string }>;
}) {
  const me = await currentStaff();
  if (!me) redirect("/login");

  const [{ error, requested }, profile, requests] = await Promise.all([
    searchParams,
    getHrProfile(me.id),
    listLeaveRequests({ staffId: me.id, limit: 50 }),
  ]);

  const balance = profile
    ? leaveBalance(profile, requests)
    : { used: 0, remaining: 0 };

  const banner = error
    ? error === "too-long"
      ? "A single request cannot be longer than 62 days."
      : "Check the dates: the end date must be on or after the start date."
    : requested
      ? `Request sent for ${requested} day(s). An administrator will review it.`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">My HR file</h1>
          <p className="text-sm text-[var(--muted)]">
            Your employment details and leave history. An administrator maintains the file itself.
          </p>
        </div>
        {me.role === "admin" ? (
          <Link href="/portal/hr" className="text-sm text-[var(--accent)] hover:underline">
            Team HR →
          </Link>
        ) : null}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Employee file</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--muted)]">Name</dt>
              <dd className="font-medium">{profile?.name ?? me.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Email</dt>
              <dd className="break-all">{profile?.email ?? me.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Job title</dt>
              <dd>{profile?.job_title || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Department</dt>
              <dd>{profile?.department || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Phone</dt>
              <dd dir="ltr" className="text-left">
                {profile?.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Hired on</dt>
              <dd>{fmtDate(profile?.hired_on ?? null)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Employment</dt>
              <dd>{profile ? EMPLOYMENT_LABELS[profile.employment_type] : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Annual entitlement</dt>
              <dd>{Number(profile?.annual_leave_days ?? 0)} days</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Annual leave</p>
          <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{balance.remaining}</p>
          <p className="text-xs text-[var(--muted)]">
            days left this year · {balance.used} used of {Number(profile?.annual_leave_days ?? 0)}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--section)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{
                width: `${
                  profile && profile.annual_leave_days > 0
                    ? Math.min(100, Math.round((balance.used / profile.annual_leave_days) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Request leave
        </h2>
        <form action={requestLeaveAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="kind" className="mb-1 block text-sm font-medium">
              Type
            </label>
            <select id="kind" name="kind" defaultValue="annual" className={inputClass}>
              {LEAVE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {LEAVE_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reason" className="mb-1 block text-sm font-medium">
              Reason <span className="text-[var(--muted)]">(optional)</span>
            </label>
            <input
              id="reason"
              name="reason"
              maxLength={1000}
              placeholder="Short note for the reviewer"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startDate" className="mb-1 block text-sm font-medium">
              First day
            </label>
            <input id="startDate" name="startDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1 block text-sm font-medium">
              Last day
            </label>
            <input id="endDate" name="endDate" type="date" required className={inputClass} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
            >
              Send request
            </button>
            <span className="text-xs text-[var(--muted)]">
              Scheduled days are counted inclusively (Friday to Monday = 4).
            </span>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          My leave history
        </h2>
        {requests.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">No leave requests yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {LEAVE_LABELS[request.kind]} · {fmtDate(request.start_date)} →{" "}
                    {fmtDate(request.end_date)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {Number(request.days)} day(s)
                    {request.reason ? ` · “${request.reason}”` : ""}
                    {request.reviewed_by_name ? ` · reviewed by ${request.reviewed_by_name}` : ""}
                    {request.review_note ? ` · “${request.review_note}”` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE[request.status]}`}
                >
                  {LEAVE_STATUS_LABELS[request.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
