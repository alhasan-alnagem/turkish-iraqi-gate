"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  decideApplicationAction,
  replyManuallyAction,
  updateApplicationStatusAction,
} from "@/app/portal/actions";
import {
  REPLY_LANGUAGES,
  REPLY_LANGUAGE_LABELS,
  type ReplyLanguage,
} from "@/lib/reply-languages";

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

const secondaryButton =
  "rounded-lg border border-[var(--border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--section)]";

function SubmitButton({
  children,
  className,
  formAction,
}: {
  children: ReactNode;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

type Decision = "hired" | "rejected";

export default function ApplicationActions({
  applicationId,
  name,
  position,
  statusFilter,
  defaultLangs,
  reviewNote,
}: {
  applicationId: string;
  name: string;
  position: string;
  statusFilter: string;
  defaultLangs: ReplyLanguage[];
  reviewNote: string;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const decisionDialog = useRef<HTMLDialogElement>(null);
  const replyDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = decisionDialog.current;
    if (!dialog) return;
    if (decision && !dialog.open) dialog.showModal();
    if (!decision && dialog.open) dialog.close();
  }, [decision]);

  useEffect(() => {
    const dialog = replyDialog.current;
    if (!dialog) return;
    if (replyOpen && !dialog.open) dialog.showModal();
    if (!replyOpen && dialog.open) dialog.close();
  }, [replyOpen]);

  const approved = decision === "hired";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={secondaryButton} onClick={() => setReplyOpen(true)}>
          Reply manually
        </button>
        <button
          type="button"
          className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-light)]"
          onClick={() => setDecision("hired")}
        >
          Approve
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
          onClick={() => setDecision("rejected")}
        >
          Reject
        </button>
      </div>

      {/* Approve / reject: save first, then the administrator decides whether an
          automatic email goes out. */}
      <dialog
        ref={decisionDialog}
        aria-labelledby={`decision-title-${applicationId}`}
        onClose={() => setDecision(null)}
        onClick={(event) => {
          if (event.target === decisionDialog.current) setDecision(null);
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/40"
      >
        {decision ? (
          <div className="p-5">
            <h2
              id={`decision-title-${applicationId}`}
              className="text-base font-bold text-[var(--primary)]"
            >
              {approved ? `Approve ${name}?` : `Reject ${name}?`}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              The decision is saved either way. Do you want to send the applicant an email
              as well?
            </p>

            <form action={decideApplicationAction} className="mt-4 space-y-3">
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="statusFilter" value={statusFilter} />
              <input type="hidden" name="decision" value={decision} />
              {/* Used by the "save without email" button below. */}
              <input type="hidden" name="status" value={decision} />

              <fieldset className="min-w-0">
                <legend className="text-xs text-[var(--muted)]">
                  Email language(s) — one email per ticked language
                </legend>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {REPLY_LANGUAGES.map((lang) => (
                    <label
                      key={lang}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground)]"
                    >
                      <input
                        type="checkbox"
                        name="langs"
                        value={lang}
                        defaultChecked={defaultLangs.includes(lang)}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      {REPLY_LANGUAGE_LABELS[lang]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor={`decision-note-${applicationId}`}
                  className="block text-xs text-[var(--muted)]"
                >
                  Personal line (optional, also saved internally)
                </label>
                <input
                  id={`decision-note-${applicationId}`}
                  name="reviewNote"
                  defaultValue={reviewNote}
                  maxLength={500}
                  placeholder="Start date, feedback, reason…"
                  className={`mt-1 ${inputClass}`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setDecision(null)}
                >
                  Cancel
                </button>
                <SubmitButton
                  formAction={updateApplicationStatusAction}
                  className={secondaryButton}
                >
                  Save without email
                </SubmitButton>
                <SubmitButton
                  className={
                    approved
                      ? "rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-light)]"
                      : "rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  }
                >
                  Send email reply
                </SubmitButton>
              </div>
            </form>
          </div>
        ) : null}
      </dialog>

      {/* Free-text reply: not a decision, so the status is left alone. */}
      <dialog
        ref={replyDialog}
        aria-labelledby={`reply-title-${applicationId}`}
        onClose={() => setReplyOpen(false)}
        onClick={(event) => {
          if (event.target === replyDialog.current) setReplyOpen(false);
        }}
        className="m-auto w-[min(38rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/40"
      >
        {replyOpen ? (
          <div className="p-5">
            <h2
              id={`reply-title-${applicationId}`}
              className="text-base font-bold text-[var(--primary)]"
            >
              Reply to {name}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Write the message yourself. It is sent from the careers mailbox, so the
              applicant&apos;s answer comes back to the same address.
            </p>

            <form action={replyManuallyAction} className="mt-4 space-y-3">
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="statusFilter" value={statusFilter} />

              <div>
                <label
                  htmlFor={`reply-subject-${applicationId}`}
                  className="block text-xs text-[var(--muted)]"
                >
                  Subject
                </label>
                <input
                  id={`reply-subject-${applicationId}`}
                  name="subject"
                  required
                  maxLength={200}
                  defaultValue={`Re: your application — ${position}`}
                  className={`mt-1 ${inputClass}`}
                />
              </div>

              <div>
                <label
                  htmlFor={`reply-body-${applicationId}`}
                  className="block text-xs text-[var(--muted)]"
                >
                  Message
                </label>
                <textarea
                  id={`reply-body-${applicationId}`}
                  name="body"
                  required
                  rows={8}
                  maxLength={6000}
                  defaultValue={`Dear ${name},\n\n`}
                  className={`mt-1 resize-y ${inputClass}`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setReplyOpen(false)}
                >
                  Cancel
                </button>
                <SubmitButton className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-light)]">
                  Send reply
                </SubmitButton>
              </div>
            </form>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
