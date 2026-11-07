import "server-only";

import { query } from "@/lib/db";

/**
 * Audit trail for applicant mail.
 *
 * Resend delivers the message straight to the applicant, so nothing appears in
 * the PrivateEmail Sent folder. These rows are the record: every manual reply,
 * decision letter and interview invitation is stored with its outcome, and the
 * detail page lists them. A BCC copy also goes to CAREER_BCC_EMAIL so the
 * conversation is visible in the careers inbox.
 *
 * Logging is best effort — a database hiccup must never make a sent email look
 * like a failure, so insert errors are swallowed after being logged.
 */

export type ApplicationEmailStatus = "sent" | "failed" | "skipped";
export type ApplicationEmailKind = "manual" | "hired" | "rejected" | "interview";

export type ApplicationEmail = {
  id: string;
  application_id: string;
  kind: ApplicationEmailKind;
  to_email: string;
  subject: string;
  body: string;
  langs: string;
  status: ApplicationEmailStatus;
  error: string;
  sent_by_name: string;
  created_at: string;
};

export const APPLICATION_EMAIL_STATUS_LABELS: Record<ApplicationEmailStatus, string> = {
  sent: "Sent",
  failed: "Failed",
  skipped: "Not sent",
};

export const APPLICATION_EMAIL_KIND_LABELS: Record<ApplicationEmailKind, string> = {
  manual: "Manual reply",
  hired: "Approval letter",
  rejected: "Decline letter",
  interview: "Interview invitation",
};

export async function recordApplicationEmail(input: {
  applicationId: string;
  kind: ApplicationEmailKind;
  to: string;
  subject: string;
  body?: string;
  langs?: string;
  status: ApplicationEmailStatus;
  error?: string;
  actorId?: string | null;
  actorName?: string;
}): Promise<void> {
  try {
    await query(
      `insert into application_emails
         (application_id, kind, to_email, subject, body, langs, status, error,
          sent_by, sent_by_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.applicationId,
        input.kind,
        input.to,
        input.subject.trim().slice(0, 300),
        (input.body ?? "").slice(0, 20000),
        (input.langs ?? "").slice(0, 40),
        input.status,
        (input.error ?? "").slice(0, 500),
        input.actorId ?? null,
        (input.actorName ?? "").slice(0, 120),
      ],
    );
  } catch (error) {
    console.error("application email log: could not record", error);
  }
}

export async function listApplicationEmails(
  applicationId: string,
  limit = 20,
): Promise<ApplicationEmail[]> {
  return query<ApplicationEmail>(
    `select id, application_id, kind, to_email, subject, body, langs, status,
            error, sent_by_name, created_at
       from application_emails
      where application_id = $1
      order by created_at desc
      limit $2`,
    [applicationId, Math.min(Math.max(limit, 1), 100)],
  );
}
