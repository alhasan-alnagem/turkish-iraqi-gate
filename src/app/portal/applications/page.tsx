import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteApplicationButton from "@/components/portal/DeleteApplicationButton";
import { currentStaff } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  applicationCounts,
  isApplicationStatus,
  listInterviews,
  listJobApplications,
  type ApplicationStatus,
} from "@/lib/job-applications";
import {
  OFFICE_TZ,
  REPLY_LANGUAGES,
  REPLY_LANGUAGE_LABELS,
  formatInterview,
  parseReplyLanguages,
  type ReplyLanguage,
} from "@/lib/application-mail";
import {
  decideApplicationAction,
  scheduleInterviewAction,
  updateApplicationStatusAction,
} from "../actions";

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

/** `datetime-local` inputs need the office clock, not the server's. */
function officeInputs(value: string | Date | null): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function languagesFor(application: {
  decision_langs: string;
  lang: string;
}): ReplyLanguage[] {
  const decided = parseReplyLanguages(application.decision_langs.split(","));
  if (decided.length) return decided;
  const own = application.lang.toLowerCase();
  return (REPLY_LANGUAGES as readonly string[]).includes(own) ? [own as ReplyLanguage] : ["en"];
}

function LangChecks({
  idPrefix,
  name = "langs",
  label,
  selected,
}: {
  idPrefix: string;
  name?: string;
  label: string;
  selected: ReplyLanguage[];
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-xs text-[var(--muted)]">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {REPLY_LANGUAGES.map((lang) => (
          <label
            key={lang}
            htmlFor={`${idPrefix}-${lang}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground)]"
          >
            <input
              id={`${idPrefix}-${lang}`}
              type="checkbox"
              name={name}
              value={lang}
              defaultChecked={selected.includes(lang)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            {REPLY_LANGUAGE_LABELS[lang]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    error?: string;
    updated?: string;
    deleted?: string;
    decided?: string;
    interview?: string;
    mailed?: string;
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

  const [applications, counts, interviews] = await Promise.all([
    listJobApplications({ status, search }),
    applicationCounts(),
    listInterviews(1),
  ]);

  const filterHref = (next?: ApplicationStatus) => {
    const query = new URLSearchParams();
    if (next) query.set("status", next);
    if (search) query.set("q", search);
    const suffix = query.toString();
    return `/portal/applications${suffix ? `?${suffix}` : ""}`;
  };

  const mailed = params.mailed ?? "";
  const mailedText =
    mailed === "off"
      ? " Saved, but no email was sent because mail is not configured."
      : mailed === "failed"
        ? " Saved, but the email could not be sent — check the mail setup."
        : mailed
          ? ` Email sent in ${mailed
              .split(",")
              .filter(Boolean)
              .map((lang) => REPLY_LANGUAGE_LABELS[lang as ReplyLanguage] ?? lang)
              .join(", ")}.`
          : "";

  const banner = (() => {
    if (params.error === "language") {
      return { tone: "error" as const, text: "Tick at least one language for the automatic reply." };
    }
    if (params.error === "interview-date") {
      return {
        tone: "error" as const,
        text: "Give both a date and a time for the interview (and a date/time when sending an invitation).",
      };
    }
    if (params.error) return { tone: "error" as const, text: "That application no longer exists." };
    if (params.decided === "hired") {
      return { tone: "ok" as const, text: `Application approved.${mailedText}` };
    }
    if (params.decided === "rejected") {
      return { tone: "ok" as const, text: `Application declined.${mailedText}` };
    }
    if (params.interview === "saved") {
      return { tone: "ok" as const, text: `Interview saved.${mailedText}` };
    }
    if (params.interview === "cleared") {
      return { tone: "ok" as const, text: "Interview removed from the tracker." };
    }
    if (params.updated) return { tone: "ok" as const, text: "Application updated." };
    if (params.deleted) return { tone: "ok" as const, text: "Application and CV deleted." };
    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">Job applications</h1>
          <p className="text-sm text-[var(--muted)]">
            Everything sent through the public career form. Decisions and interview
            invitations are emailed automatically in the language you tick.
          </p>
        </div>
        <Link href="/portal/hr" className="text-sm text-[var(--accent)] hover:underline">
          People &amp; HR →
        </Link>
      </div>

      {banner ? (
        <p
          role={banner.tone === "error" ? "alert" : "status"}
          className={
            banner.tone === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          }
        >
          {banner.text}
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
          Interview tracker
          <span className="rounded-full bg-[var(--section)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
            {interviews.length}
          </span>
        </h2>

        {interviews.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">
            No interviews booked. Set a date on an application below and it shows up here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {interviews.map((interview) => (
              <li
                key={interview.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatInterview(interview.interview_at as unknown as string)} ·{" "}
                    {interview.name}
                    <span
                      className={`ml-2 rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE[interview.status]}`}
                    >
                      {APPLICATION_STATUS_LABELS[interview.status]}
                    </span>
                    {interview.is_past ? (
                      <span className="ml-2 rounded bg-[var(--section)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                        past
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {interview.position}
                    {interview.interview_mode ? ` · ${interview.interview_mode}` : ""}
                    {interview.interview_note ? ` · ${interview.interview_note}` : ""}
                  </p>
                </div>
                <Link
                  href={`#app-${interview.id}`}
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
            {applications.map((application) => {
              const langs = languagesFor(application);
              const slot = officeInputs(application.interview_at);

              return (
                <li
                  key={application.id}
                  id={`app-${application.id}`}
                  className="scroll-mt-24 space-y-4 px-5 py-5"
                >
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
                        {application.source === "email" ? (
                          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                            from email
                          </span>
                        ) : null}
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

                  {application.interview_at ? (
                    <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                      Interview booked: <strong>{formatInterview(application.interview_at)}</strong>
                      {application.interview_mode ? ` · ${application.interview_mode}` : ""}
                      {application.interview_note ? ` · ${application.interview_note}` : ""}
                    </p>
                  ) : null}

                  {application.decision_langs || application.decided_at ? (
                    <p className="rounded-lg border border-[var(--border)] bg-[var(--section)] px-3 py-2 text-sm">
                      {application.decided_at ? (
                        <>
                          Decided {fmtDateTime(application.decided_at)} ·{" "}
                        </>
                      ) : null}
                      {application.decision_langs
                        ? `replied in ${parseReplyLanguages(application.decision_langs.split(","))
                            .map((lang) => REPLY_LANGUAGE_LABELS[lang])
                            .join(", ")}`
                        : "no reply email recorded"}
                    </p>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Interview tracker
                      </p>
                      <form
                        action={scheduleInterviewAction}
                        className="mt-2 grid gap-2 sm:grid-cols-2"
                      >
                        <input type="hidden" name="applicationId" value={application.id} />
                        <div>
                          <label
                            htmlFor={`interview-date-${application.id}`}
                            className="block text-xs text-[var(--muted)]"
                          >
                            Date
                          </label>
                          <input
                            id={`interview-date-${application.id}`}
                            type="date"
                            name="interviewDate"
                            defaultValue={slot.date}
                            className={`mt-1 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`interview-time-${application.id}`}
                            className="block text-xs text-[var(--muted)]"
                          >
                            Time (Baghdad)
                          </label>
                          <input
                            id={`interview-time-${application.id}`}
                            type="time"
                            name="interviewTime"
                            defaultValue={slot.time}
                            className={`mt-1 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`interview-mode-${application.id}`}
                            className="block text-xs text-[var(--muted)]"
                          >
                            Format
                          </label>
                          <select
                            id={`interview-mode-${application.id}`}
                            name="interviewMode"
                            defaultValue={application.interview_mode}
                            className={`mt-1 ${inputClass}`}
                          >
                            <option value="">Not set</option>
                            <option value="Office">Office</option>
                            <option value="Video call">Video call</option>
                            <option value="Phone call">Phone call</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor={`interview-note-${application.id}`}
                            className="block text-xs text-[var(--muted)]"
                          >
                            Place / notes
                          </label>
                          <input
                            id={`interview-note-${application.id}`}
                            name="interviewNote"
                            defaultValue={application.interview_note}
                            maxLength={500}
                            placeholder="Office, 2nd floor…"
                            className={`mt-1 ${inputClass}`}
                          />
                        </div>

                        <LangChecks
                          idPrefix={`invite-langs-${application.id}`}
                          label="Invitation language(s)"
                          selected={langs}
                        />

                        <label className="flex items-center gap-2 text-xs text-[var(--foreground)] sm:col-span-2">
                          <input
                            type="checkbox"
                            name="sendInvite"
                            defaultChecked
                            className="h-3.5 w-3.5 accent-[var(--accent)]"
                          />
                          Send the invitation email now
                        </label>

                        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
                          >
                            Save interview
                          </button>
                          <span className="text-[11px] text-[var(--muted)]">
                            Clear both date and time to remove it.
                          </span>
                        </div>
                      </form>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Decision &amp; automatic reply
                      </p>
                      <form action={decideApplicationAction} className="mt-2 grid gap-2">
                        <input type="hidden" name="applicationId" value={application.id} />
                        <input type="hidden" name="statusFilter" value={status ?? ""} />

                        <LangChecks
                          idPrefix={`decision-langs-${application.id}`}
                          label="Reply language(s) — one email per ticked language"
                          selected={langs}
                        />

                        <div>
                          <label
                            htmlFor={`decision-note-${application.id}`}
                            className="block text-xs text-[var(--muted)]"
                          >
                            Personal line (optional, also saved internally)
                          </label>
                          <input
                            id={`decision-note-${application.id}`}
                            name="reviewNote"
                            defaultValue={application.review_note}
                            maxLength={500}
                            placeholder="Start date, feedback, reason…"
                            className={`mt-1 ${inputClass}`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="submit"
                            name="decision"
                            value="hired"
                            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
                          >
                            Approve &amp; send
                          </button>
                          <button
                            type="submit"
                            name="decision"
                            value="rejected"
                            className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                          >
                            Decline &amp; send
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-2 border-t border-[var(--border)] pt-3">
                    <form
                      action={updateApplicationStatusAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="applicationId" value={application.id} />
                      <input type="hidden" name="statusFilter" value={status ?? ""} />
                      <div>
                        <label
                          htmlFor={`status-${application.id}`}
                          className="block text-xs text-[var(--muted)]"
                        >
                          Status only (no email)
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
