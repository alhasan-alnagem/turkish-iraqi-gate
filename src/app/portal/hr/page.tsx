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
import {
  APPLICATION_STATUS_LABELS,
  applicationCounts,
  listJobApplications,
  type ApplicationStatus,
} from "@/lib/job-applications";
import { listJoinRequests } from "@/lib/staff-requests";
import { formatInterview } from "@/lib/application-mail";
import { decideLeaveAction, saveHrProfileAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * "Current requests" on the dashboard is a two-week inbox: an applicant or a
 * join request from 15 days ago is no longer current, so it drops off this card
 * (it stays in the full queue at /portal/applications and /portal/requests).
 */
const RECENT_DAYS = 14;

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

const fmtReceived = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const APPLICATION_BADGE: Record<ApplicationStatus, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700",
  shortlisted: "border-amber-200 bg-amber-50 text-amber-700",
  interview: "border-violet-200 bg-violet-50 text-violet-700",
  hired: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; decided?: string }>;
}) {
  const me = await currentStaff();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/portal/hr/me");

  const [
    { error, saved, decided },
    summary,
    team,
    pendingLeave,
    onLeave,
    applications,
    recentApplications,
    recentJoinRequests,
  ] = await Promise.all([
    searchParams,
    hrSummary(),
    listTeamHr(),
    listLeaveRequests({ status: "pending" }),
    listOnLeaveToday(),
    applicationCounts(),
    listJobApplications({ limit: 6, withinDays: RECENT_DAYS }),
    listJoinRequests("pending", { withinDays: RECENT_DAYS }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">People &amp; HR</h1>
          <p className="text-sm text-[var(--muted)]">
            Employee files, leave decisions, join requests and job applications in one place.
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

        <Link
          href="/portal/applications"
          className="rounded-2xl border border-[var(--border)] bg-white p-4 transition-colors hover:border-[var(--accent)]"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Applications</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{applications.new}</p>
          <p className="text-xs text-[var(--accent)]">new · review →</p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-white">
          <h2 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Current requests
            <span className="text-[11px] font-medium normal-case tracking-normal">
              last {RECENT_DAYS} days
            </span>
          </h2>

          {recentJoinRequests.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--muted)]">
              No join requests in the last {RECENT_DAYS} days.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentJoinRequests.map((request) => (
                <li key={request.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {request.name}
                    </p>
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                      wants to join
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]" dir="ltr">
                    {request.email}
                    {request.phone ? ` · ${request.phone}` : ""}
                  </p>
                  {request.message ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--foreground)]">
                      “{request.message}”
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Received {fmtReceived(request.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3 text-sm">
            <span className="text-xs text-[var(--muted)]">
              {summary.pendingJoinRequests > recentJoinRequests.length
                ? `${summary.pendingJoinRequests - recentJoinRequests.length} older still waiting`
                : "Nothing older waiting"}
            </span>
            <Link href="/portal/requests" className="font-medium text-[var(--accent)] hover:underline">
              Open the join queue →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white">
          <h2 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Job applications
            <span className="text-[11px] font-medium normal-case tracking-normal">
              last {RECENT_DAYS} days
            </span>
          </h2>

          {recentApplications.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--muted)]">
              No applications in the last {RECENT_DAYS} days.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentApplications.map((application) => (
                <li key={application.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {application.status === "new" ? "New application" : "Application"} —{" "}
                      {application.name}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${APPLICATION_BADGE[application.status]}`}
                    >
                      {APPLICATION_STATUS_LABELS[application.status]}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted)]">
                    Received {fmtReceived(application.created_at)} · site language{" "}
                    {application.lang.toUpperCase()}
                  </p>

                  {application.interview_at ? (
                    <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
                      Interview: <strong>{formatInterview(application.interview_at)}</strong>
                      {application.interview_mode ? ` · ${application.interview_mode}` : ""}
                    </p>
                  ) : null}

                  <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[5.5rem_minmax(0,1fr)]">
                    <dt className="text-[var(--muted)]">Full name</dt>
                    <dd className="text-[var(--foreground)]">{application.name}</dd>
                    <dt className="text-[var(--muted)]">Email</dt>
                    <dd className="text-[var(--foreground)]" dir="ltr">
                      <a href={`mailto:${application.email}`} className="hover:underline">
                        {application.email}
                      </a>
                    </dd>
                    <dt className="text-[var(--muted)]">Phone</dt>
                    <dd className="text-[var(--foreground)]" dir="ltr">
                      {application.phone || "—"}
                    </dd>
                    <dt className="text-[var(--muted)]">Position</dt>
                    <dd className="text-[var(--foreground)]">{application.position}</dd>
                    <dt className="text-[var(--muted)]">CV file</dt>
                    <dd className="text-[var(--foreground)]" dir="ltr">
                      {application.cv_name ? (
                        <a
                          href={`/api/portal/applications/${application.id}/cv`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[var(--accent)] hover:underline"
                        >
                          {application.cv_name}
                        </a>
                      ) : (
                        "No CV stored"
                      )}
                      {application.cv_name && application.cv_size > 0
                        ? ` (${Math.max(1, Math.round(application.cv_size / 1024))} KB)`
                        : ""}
                    </dd>
                  </dl>

                  {application.message ? (
                    <div>
                      <p className="text-xs text-[var(--muted)]">Cover letter</p>
                      <p className="mt-1 whitespace-pre-line rounded-lg bg-[var(--section)] px-3 py-2 text-sm text-[var(--foreground)]">
                        {application.message}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3 text-sm">
            <span className="text-xs text-[var(--muted)]">
              {applications.all > recentApplications.length
                ? `${applications.all - recentApplications.length} older in the file`
                : "Nothing older in the file"}
            </span>
            <Link
              href="/portal/applications"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Review all applications →
            </Link>
          </div>
        </section>
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
