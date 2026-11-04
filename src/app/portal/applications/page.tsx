import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteApplicationButton from "@/components/portal/DeleteApplicationButton";
import { currentStaff } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  applicationCounts,
  isApplicationStatus,
  listJobApplications,
  type ApplicationStatus,
} from "@/lib/job-applications";
import { updateApplicationStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

const BADGE: Record<ApplicationStatus, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700",
  shortlisted: "border-amber-200 bg-amber-50 text-amber-700",
  interview: "border-violet-200 bg-violet-50 text-violet-700",
  hired: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const fmtDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    error?: string;
    updated?: string;
    deleted?: string;
  }>;
}) {
  const me = await currentStaff();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/portal");

  const params = await searchParams;
  const status = isApplicationStatus(params.status ?? "")
    ? (params.status as ApplicationStatus)
    : undefined;
  const search = (params.q ?? "").trim();

  const [applications, counts] = await Promise.all([
    listJobApplications({ status, search }),
    applicationCounts(),
  ]);

  const filterHref = (next?: ApplicationStatus) => {
    const query = new URLSearchParams();
    if (next) query.set("status", next);
    if (search) query.set("q", search);
    const suffix = query.toString();
    return `/portal/applications${suffix ? `?${suffix}` : ""}`;
  };

  const banner = params.error
    ? "That application no longer exists."
    : params.updated
      ? "Application updated."
      : params.deleted
        ? "Application and CV deleted."
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">Job applications</h1>
          <p className="text-sm text-[var(--muted)]">
            Every CV sent through the public career form, stored here instead of only in the
            mailbox.
          </p>
        </div>
        <Link href="/portal/hr" className="text-sm text-[var(--accent)] hover:underline">
          People &amp; HR →
        </Link>
      </div>

      {banner ? (
        <p
          role={params.error ? "alert" : "status"}
          className={
            params.error
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          }
        >
          {banner}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={filterHref()}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            status
              ? "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"
              : "border-[var(--accent)] bg-[var(--accent)] text-white"
          }`}
        >
          All {counts.all}
        </Link>
        {APPLICATION_STATUSES.map((key) => (
          <Link
            key={key}
            href={filterHref(key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              status === key
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {APPLICATION_STATUS_LABELS[key]} {counts[key]}
          </Link>
        ))}

        <form action="/portal/applications" method="get" className="ml-auto flex items-center gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Name, email or position"
            aria-label="Search applications"
            className="w-56 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[var(--section)]"
          >
            Search
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <h2 className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {status ? APPLICATION_STATUS_LABELS[status] : "All applications"}
          <span className="rounded-full bg-[var(--section)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
            {applications.length}
          </span>
        </h2>

        {applications.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--muted)]">
            {search || status
              ? "Nothing matches that filter."
              : "No applications yet. They appear here as soon as the public form is used."}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {applications.map((application) => (
              <li key={application.id} className="space-y-3 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {application.name}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE[application.status]}`}
                      >
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </span>
                      <span className="rounded bg-[var(--section)] px-1.5 py-0.5 text-[11px] font-medium uppercase text-[var(--muted)]">
                        {application.lang}
                      </span>
                    </p>
                    <p className="text-sm text-[var(--foreground)]">{application.position}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">
                      <a href={`mailto:${application.email}`} className="hover:underline">
                        {application.email}
                      </a>
                      {application.phone ? ` · ${application.phone}` : ""}
                    </p>
                  </div>

                  <div className="text-right text-xs text-[var(--muted)]">
                    <p>Received {fmtDateTime(application.created_at)}</p>
                    {application.reviewed_by_name ? (
                      <p>Last touched by {application.reviewed_by_name}</p>
                    ) : null}
                    {application.cv_name ? (
                      <a
                        href={`/api/portal/applications/${application.id}/cv`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                      >
                        Open CV
                        <span className="font-normal text-[var(--muted)]">
                          ({application.cv_name},{" "}
                          {application.cv_size > 0
                            ? `${Math.max(1, Math.round(application.cv_size / 1024))} KB`
                            : "size unknown"}
                          )
                        </span>
                      </a>
                    ) : (
                      <p>No CV stored</p>
                    )}
                  </div>
                </div>

                {application.message ? (
                  <p className="max-w-prose whitespace-pre-line rounded-lg bg-[var(--section)] px-3 py-2 text-sm">
                    {application.message}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-end gap-2">
                  <form
                    action={updateApplicationStatusAction}
                    className="flex flex-1 flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="statusFilter" value={status ?? ""} />
                    <div>
                      <label
                        htmlFor={`status-${application.id}`}
                        className="block text-xs text-[var(--muted)]"
                      >
                        Status
                      </label>
                      <select
                        id={`status-${application.id}`}
                        name="status"
                        defaultValue={application.status}
                        className={`mt-1 ${inputClass}`}
                      >
                        {APPLICATION_STATUSES.map((key) => (
                          <option key={key} value={key}>
                            {APPLICATION_STATUS_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-48 flex-1">
                      <label
                        htmlFor={`note-${application.id}`}
                        className="block text-xs text-[var(--muted)]"
                      >
                        Internal note
                      </label>
                      <input
                        id={`note-${application.id}`}
                        name="reviewNote"
                        defaultValue={application.review_note}
                        maxLength={500}
                        placeholder="Interview date, feedback, reason…"
                        className={`mt-1 ${inputClass}`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--section)]"
                    >
                      Save
                    </button>
                  </form>

                  <DeleteApplicationButton applicationId={application.id} name={application.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
