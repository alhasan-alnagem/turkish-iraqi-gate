/**
 * Portal mail tagging — how the PrivateEmail inbox knows what came from the
 * website.
 *
 * PrivateEmail has no API and no "labels": a label there is an IMAP folder
 * filled by a server-side filter rule, and those rules can only look at
 * From / To / CC / Subject / Body. That makes the obvious filters useless here:
 *
 *  - every portal message leaves from the same Resend sender, so `From` cannot
 *    tell a website notification from mail to an applicant;
 *  - the copy that reaches the company is often a BCC (`careers@tigip.com`), and
 *    a BCC address appears in neither `To` nor `CC`.
 *
 * So the subject line is the only marker that survives both. Every message the
 * portal sends starts with `TAG`, and one PrivateEmail filter —
 * *Subject contains `[TIGIP]` → move to folder "Website Portal"* — files them
 * all automatically. The click-by-click setup is in AGENTS.md §11.
 */
export const PORTAL_TAG = "[TIGIP]";

/** Prepends the tag once, even if a caller already added it. */
export function portalSubject(subject: string): string {
  const clean = subject.trim().replace(/\s+/g, " ");
  if (!clean) return PORTAL_TAG;
  return clean.startsWith(PORTAL_TAG) ? clean : `${PORTAL_TAG} ${clean}`;
}
