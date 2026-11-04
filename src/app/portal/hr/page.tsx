import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import {
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  LEAVE_LABELS,
  countDays,
  hrSummary,
  listLeaveRequests,
  listOnLeaveToday,
  listTeamHr,
} from "@/lib/hr";
import { decideLeaveAction, saveHrProfileAction } from "../actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

const fmtDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "—";

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; decided?: string }>;
}) {
  const me = await currentStaff();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/portal/hr/me");

  const [{ error, saved, decided }, summary, team, pendingLeave, onLeave] = await Promise.all([
    searchParams,
    hrSummary(),
    listTeamHr(),
    listLeaveRequests({ status: "pending" }),
    listOnLeaveToday(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">People &amp; HR</h1>
          <p className="text-sm text-[var(--muted)]">
            Employee files, leave decisions and the join queue in one place.
          </p>
        </div>
        <Link href="/portal/hr/me" className="text-sm text-[var(--accent)] hover:underline">
          My HR file →
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "not-found"
            ? "That entry no longer exists or was already reviewed."
            : "Something went wrong. Try again."}
        </p>
      ) : saved ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Employee file saved.
        </p>
      ) : decided ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Leave request updated. The requester can see the decision on their HR page.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Team", value: summary.headcount, hint: "active accounts" },
          { label: "Departments", value: summary.departments, hint: "with people in them" },
          { label: "On leave today", value: summary.onLeaveToday, hint: "approved leave" },
          { label: "Leave requests", value: summary.pendingLeave, hint: "awaiting decision" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border)] bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{card.value}</p>
            <p className="text-xs text-[var(--muted)]">{card.hint}</p>
          </div>
        ))}

        <Link
          href="/portal/requests"
          className="rounded-2xl border border-[var(--border)] bg-white p-4 transition-colors hover:border-[var(--accent)]"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Join requests</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary)]">
            {summary.pendingJoinRequests}
          </p>
          <p className="text-xs text-[var(--accent)]">review →</p>
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Leave waiting for a decision
        </h2>
        {pendingLeave.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {pendingLeave.map((request) => (
              <li key={request.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {request.staff_name} · {LEAVE_LABELS[request.kind]}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {fmtDate(request.start_date)} → {fmtDate(request.end_date)} ·{" "}
                    {countDays(request.start_date, request.end_date)} day(s)
                    {request.reason ? ` · “${request.reason}”` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={decideLeaveAction} className="flex items-center gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <input
                      name="reviewNote"
                      placeholder="Note (optional)"
                      className="w-40 rounded-lg border border-[var(--border)] px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={decideLeaveAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-white">
          <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Employee files
          </h2>
          <ul className="divide-y divide-[var(--border)]">
            {team.map((member) => (
              <li key={member.id} className="p-5">
                <form action={saveHrProfileAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="staffId" value={member.id} />

                  <div className="sm:col-span-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {member.name}
                      {!member.active ? (
                        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
                          inactive
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {member.email} · {member.role}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--muted)]">Job title</label>
                    <input
                      name="jobTitle"
                      defaultValue={member.job_title}
                      placeholder="e.g. Procurement officer"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Department</label>
                    <input
                      name="department"
                      defaultValue={member.department}
                      placeholder="e.g. Sourcing"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Phone</label>
                    <input
                      name="phone"
                      defaultValue={member.phone}
                      dir="ltr"
                      placeholder="+964 …"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Hired on</label>
                    <input
                      name="hiredOn"
                      type="date"
                      defaultValue={member.hired_on ?? ""}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Employment</label>
                    <select
                      name="employmentType"
                      defaultValue={member.employment_type}
                      className={`mt-1 ${inputClass}`}
                    >
                      {EMPLOYMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {EMPLOYMENT_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]">Annual leave days</label>
                    <input
                      name="annualLeaveDays"
                      type="number"
                      min={0}
                      max={120}
                      defaultValue={member.annual_leave_days}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-[var(--muted)]">Internal notes</label>
                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={member.notes}
                      placeholder="Contract details, emergency contact, review dates…"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--section)]"
                    >
                      Save file
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="h-fit rounded-2xl border border-[var(--border)] bg-white">
          <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            On leave today
          </h2>
          {onLeave.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--muted)]">Everyone is available.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {onLeave.map((person) => (
                <li key={`${person.name}-${person.end_date}`} className="px-5 py-3 text-sm">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {LEAVE_LABELS[person.kind]} · back {fmtDate(person.end_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
