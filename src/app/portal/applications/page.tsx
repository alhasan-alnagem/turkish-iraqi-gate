import Link from "next/link";
import { redirect } from "next/navigation";
import ApplicationActions from "@/components/portal/ApplicationActions";
import DeleteApplicationButton from "@/components/portal/DeleteApplicationButton";
import TodayButton from "@/components/portal/TodayButton";
import { currentStaff } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  applicationCounts,
  getJobApplication,
  isApplicationStatus,
  listInterviews,
  listJobApplications,
  type ApplicationStatus,
} from "@/lib/job-applications";
import {
  APPLICATION_EMAIL_KIND_LABELS,
  APPLICATION_EMAIL_STATUS_LABELS,
  listApplicationEmails,
} from "@/lib/application-emails";
import {
  OFFICE_TZ,
  REPLY_LANGUAGES,
  REPLY_LANGUAGE_LABELS,
  formatInterview,
  parseReplyLanguages,
  type ReplyLanguage,
} from "@/lib/application-mail";
import { scheduleInterviewAction, updateApplicationStatusAction } from "../actions";

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

const fmtDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
    app?: string;
    id?: string;
    error?: string;
    updated?: string;
    deleted?: string;
    decided?: string;
    interview?: string;
    mailed?: string;
    replied?: string;
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
  const selectedId = (params.app ?? params.id ?? "").trim();

  const [applications, counts, interviews, selected, emails] = await Promise.all([
    listJobApplications({ status, search }),
    applicationCounts(),
    listInterviews(1),
    selectedId ? getJobApplication(selectedId) : Promise.resolve(null),
    selectedId ? listApplicationEmails(selectedId) : Promise.resolve([]),
  ]);

  const filterHref = (next?: ApplicationStatus) => {
    const query = new URLSearchParams();
    if (next) query.set("status", next);
    if (search) query.set("q", search);
    const suffix = query.toString();
    return `/portal/applications${suffix ? `?${suffix}` : ""}`;
  };

  const listHref = filterHref(status);

  const appHref = (id: string) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (search) query.set("q", search);
    query.set("app", id);
    return `/portal/applications?${query.toString()}`;
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
    if (params.error === "manual-empty") {
      return { tone: "error" as const, text: "Write both a subject and a message before sending." };
    }
    if (params.error) return { tone: "error" as const, text: "That application no longer exists." };
    if (params.replied === "sent") {
      return { tone: "ok" as const, text: "Manual reply sent." };
    }
    if (params.replied === "off") {
      return { tone: "error" as const, text: "Reply not sent: mail is not configured." };
    }
    if (params.replied === "failed") {
      return { tone: "error" as const, text: "Reply could not be sent — check the mail setup." };
    }
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

  const cvSize =
    selected && selected.cv_size > 0
      ? `${Math.max(1, Math.round(selected.cv_size / 1024))} KB`
      : "size unknown";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--primary)]">Job applications</h1>
          <p className="text-sm text-[var(--muted)]">
            Pick a name to see the CV, the cover letter and the decision buttons.
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
          scroll={false}
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
            scroll={false}
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

      <details
        className="rounded-2xl border border-[var(--border)] bg-white"
        open={interviews.length > 0}
      >
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Interview tracker
          <span className="ml-2 rounded-full bg-[var(--section)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
            {interviews.length}
          </span>
        </summary>

        {interviews.length === 0 ? (
          <p className="border-t border-[var(--border)] px-5 py-4 text-sm text-[var(--muted)]">
            No interviews booked. Open an application and use “Schedule an interview”.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
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
                  href={appHref(interview.id)}
                  scroll={false}
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </details>

      <div className="grid items-start gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <aside
          className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-white lg:sticky lg:top-4 ${
            selected ? "hidden lg:block" : ""
          }`}
        >
          <h2 className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {status ? APPLICATION_STATUS_LABELS[status] : "All applications"}
            <span className="rounded-full bg-[var(--section)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
              {applications.length}
            </span>
          </h2>

          {applications.length === 0 ? (
            <p className="px-4 py-8 text-sm text-[var(--muted)]">
              {search || status
                ? "Nothing matches that filter."
                : "No applications yet. They appear here as soon as the public form is used."}
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-[var(--border)] overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
              {applications.map((application) => {
                const active = selected?.id === application.id;
                return (
                  <li key={application.id}>
                    <Link
                      href={appHref(application.id)}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={`block border-l-2 px-4 py-3 transition-colors ${
                        active
                          ? "border-[var(--accent)] bg-[var(--section)]"
                          : "border-transparent hover:bg-[var(--section)]"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
                          {application.name}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${BADGE[application.status]}`}
                        >
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--foreground)]">
                        {application.position}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                        <span>{fmtDate(application.created_at)}</span>
                        <span className="uppercase">{application.lang}</span>
                        {application.source === "email" ? (
                          <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                            from email
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className={selected ? "min-w-0" : "hidden min-w-0 lg:block"}>
          {selected ? (
            <article
              key={selected.id}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"
            >
              <div className="border-b border-[var(--border)] px-5 py-4">
                <Link
                  href={listHref}
                  scroll={false}
                  className="text-xs font-medium text-[var(--accent)] hover:underline lg:hidden"
                >
                  ← All applications
                </Link>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-[var(--primary)]">{selected.name}</h2>
                    <p className="text-sm text-[var(--foreground)]">{selected.position}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE[selected.status]}`}
                      >
                        {APPLICATION_STATUS_LABELS[selected.status]}
                      </span>
                      <span className="rounded bg-[var(--section)] px-1.5 py-0.5 text-[11px] font-medium uppercase text-[var(--muted)]">
                        {selected.lang}
                      </span>
                      {selected.source === "email" ? (
                        <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                          from email
                        </span>
                      ) : null}
                      <span>Received {fmtDateTime(selected.created_at)}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--muted)]">
                    {selected.reviewed_by_name ? (
                      <p>Last touched by {selected.reviewed_by_name}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <dl className="grid gap-3 border-b border-[var(--border)] px-5 py-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Email
                  </dt>
                  <dd className="mt-0.5 break-all text-sm">
                    <a href={`mailto:${selected.email}`} className="text-[var(--accent)] hover:underline">
                      {selected.email}
                    </a>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Phone
                  </dt>
                  <dd className="mt-0.5 text-sm" dir="ltr">
                    {selected.phone || "—"}
                  </dd>
                </div>
              </dl>

              <div className="space-y-3 border-b border-[var(--border)] px-5 py-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--section)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    CV
                  </p>
                  {selected.cv_name ? (
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-all text-sm">
                        {selected.cv_name}{" "}
                        <span className="text-[var(--muted)]">· {cvSize}</span>
                      </p>
                      <a
                        href={`/api/portal/applications/${selected.id}/cv`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-light)]"
                      >
                        Open CV ↗
                      </a>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      No CV stored with this application.
                    </p>
                  )}
                </div>

                {selected.message ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Cover letter
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">{selected.message}</p>
                  </div>
                ) : null}
              </div>

              {selected.interview_at || selected.decision_langs || selected.decided_at ? (
                <div className="space-y-2 border-b border-[var(--border)] px-5 py-3">
                  {selected.interview_at ? (
                    <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                      Interview booked: <strong>{formatInterview(selected.interview_at)}</strong>
                      {selected.interview_mode ? ` · ${selected.interview_mode}` : ""}
                      {selected.interview_note ? ` · ${selected.interview_note}` : ""}
                    </p>
                  ) : null}
                  {selected.decision_langs || selected.decided_at ? (
                    <p className="rounded-lg border border-[var(--border)] bg-[var(--section)] px-3 py-2 text-sm">
                      {selected.decided_at ? (
                        <>Decided {fmtDateTime(selected.decided_at)} · </>
                      ) : null}
                      {selected.decision_langs
                        ? `replied in ${parseReplyLanguages(selected.decision_langs.split(","))
                            .map((lang) => REPLY_LANGUAGE_LABELS[lang])
                            .join(", ")}`
                        : "no reply email recorded"}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="border-b border-[var(--border)] px-5 py-4">
                <ApplicationActions
                  key={selected.id}
                  applicationId={selected.id}
                  name={selected.name}
                  position={selected.position}
                  statusFilter={status ?? ""}
                  defaultLangs={languagesFor(selected)}
                  reviewNote={selected.review_note}
                />
              </div>

              {/* Resend does not write to a mailbox Sent folder, so this is the
                  record of what the applicant actually received. */}
              <div className="border-b border-[var(--border)] px-5 py-4">
                <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Sent messages
                  <span className="rounded-full bg-[var(--section)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
                    {emails.length}
                  </span>
                </p>
                {emails.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Nothing sent yet. Manual replies and decision emails are recorded here,
                    and a copy is BCC&apos;d to the careers inbox.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {emails.map((mail) => (
                      <li
                        key={mail.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--section)] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">
                              {mail.subject}
                            </p>
                            <p className="mt-0.5 break-all text-xs text-[var(--muted)]">
                              {fmtDateTime(mail.created_at)} · {APPLICATION_EMAIL_KIND_LABELS[mail.kind]} ·
                              to {mail.to_email}
                              {mail.langs
                                ? ` · ${mail.langs
                                    .split(",")
                                    .filter(Boolean)
                                    .map((lang) => REPLY_LANGUAGE_LABELS[lang as ReplyLanguage] ?? lang)
                                    .join(", ")}`
                                : ""}
                              {mail.sent_by_name ? ` · by ${mail.sent_by_name}` : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              mail.status === "sent"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : mail.status === "failed"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {APPLICATION_EMAIL_STATUS_LABELS[mail.status]}
                          </span>
                        </div>
                        <div className="mt-2 rounded-lg border border-[var(--border)] bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            Message as sent
                          </p>
                          {mail.body ? (
                            <p
                              dir="auto"
                              className="mt-1 whitespace-pre-line text-sm text-[var(--foreground)]"
                            >
                              {mail.body}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              The message text was not recorded for this send.
                            </p>
                          )}
                        </div>
                        {mail.error ? (
                          <p className="mt-1 break-words text-xs text-red-700">{mail.error}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <details className="border-b border-[var(--border)] px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
                  Status &amp; internal note{" "}
                  <span className="text-xs font-normal text-[var(--muted)]">
                    (no email is sent)
                  </span>
                </summary>
                <form
                  action={updateApplicationStatusAction}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="applicationId" value={selected.id} />
                  <input type="hidden" name="statusFilter" value={status ?? ""} />
                  <div>
                    <label
                      htmlFor={`status-${selected.id}`}
                      className="block text-xs text-[var(--muted)]"
                    >
                      Status
                    </label>
                    <select
                      id={`status-${selected.id}`}
                      name="status"
                      defaultValue={selected.status}
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
                      htmlFor={`note-${selected.id}`}
                      className="block text-xs text-[var(--muted)]"
                    >
                      Internal note
                    </label>
                    <input
                      id={`note-${selected.id}`}
                      name="reviewNote"
                      defaultValue={selected.review_note}
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
              </details>

              <details
                className="border-b border-[var(--border)] px-5 py-4"
                open={Boolean(selected.interview_at)}
              >
                <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
                  Schedule an interview
                </summary>
                <form
                  action={scheduleInterviewAction}
                  className="mt-3 grid gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="applicationId" value={selected.id} />
                  <input type="hidden" name="statusFilter" value={status ?? ""} />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`interview-date-${selected.id}`}
                        className="block text-xs text-[var(--muted)]"
                      >
                        Date (dd/mm/yyyy)
                      </label>
                      <TodayButton inputId={`interview-date-${selected.id}`} />
                    </div>
                    <input
                      id={`interview-date-${selected.id}`}
                      type="date"
                      name="interviewDate"
                      defaultValue={officeInputs(selected.interview_at).date}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`interview-time-${selected.id}`}
                      className="block text-xs text-[var(--muted)]"
                    >
                      Time (Baghdad)
                    </label>
                    <input
                      id={`interview-time-${selected.id}`}
                      type="time"
                      name="interviewTime"
                      defaultValue={officeInputs(selected.interview_at).time}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`interview-mode-${selected.id}`}
                      className="block text-xs text-[var(--muted)]"
                    >
                      Format
                    </label>
                    <select
                      id={`interview-mode-${selected.id}`}
                      name="interviewMode"
                      defaultValue={selected.interview_mode}
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
                      htmlFor={`interview-note-${selected.id}`}
                      className="block text-xs text-[var(--muted)]"
                    >
                      Place / notes
                    </label>
                    <input
                      id={`interview-note-${selected.id}`}
                      name="interviewNote"
                      defaultValue={selected.interview_note}
                      maxLength={500}
                      placeholder="Office, 2nd floor…"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>

                  <LangChecks
                    idPrefix={`invite-langs-${selected.id}`}
                    label="Invitation language(s)"
                    selected={languagesFor(selected)}
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
              </details>

              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-xs text-[var(--muted)]">
                  Deleting removes the application and its CV permanently.
                </p>
                <DeleteApplicationButton
                  applicationId={selected.id}
                  name={selected.name}
                />
              </div>
            </article>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-white p-8">
              <p className="max-w-sm text-center text-sm text-[var(--muted)]">
                Select a name from the list to see the application, open the CV and approve
                or reject it.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
