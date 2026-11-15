/**
 * iCalendar (RFC 5545) invitations, built as plain strings.
 *
 * Why an invitation and not "just an email": PrivateEmail's calendar accepts
 * standard iCal and adds an incoming invitation to the calendar as a pending
 * event (Accept / Decline / Maybe), the same as Gmail or Outlook. That is the
 * only way to put an interview on the private calendar without storing the
 * mailbox password and driving CalDAV/IMAP from the server.
 *
 * Everything is emitted in UTC (`...Z`) on purpose: `TZID` would require a full
 * VTIMEZONE block, and Baghdad has a fixed +03 offset with no daylight saving,
 * so conversion is exact and the file stays portable.
 */

const CRLF = "\r\n";

type InviteInput = {
  /** Stable per interview, e.g. `<application-id>@tigip.com`. */
  uid: string;
  /** ISO timestamp with an offset (`2026-11-10 14:30 +03` works too). */
  start: string;
  minutes?: number;
  summary: string;
  description?: string;
  location?: string;
  organizer: string;
  attendees: string[];
  /** Must grow when an event is moved or re-sent. */
  sequence?: number;
  cancelled?: boolean;
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: no line longer than 75 octets, continuations start with a space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never cut a multi-byte character in half.
    while (end > start + 1 && (bytes[end] & 0xc0) === 0x80) end -= 1;
    parts.push((start === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // the leading space counts towards the 75 octets
  }

  return parts.join(CRLF);
}

function utcStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

/** A stable UID for one booking; the same id on a reschedule updates the event. */
export function interviewUid(applicationId: string): string {
  return `${applicationId.trim() || "interview"}@tigip.com`;
}

export function buildCalendarInvite(input: InviteInput): string {
  const start = new Date(input.start);
  const startStamp = utcStamp(start);
  if (!startStamp) throw new Error("calendar invite: invalid start time");

  const endStamp = utcStamp(
    new Date(start.getTime() + Math.max(input.minutes ?? 45, 5) * 60_000),
  );
  const nowStamp = utcStamp(new Date());
  const method = input.cancelled ? "CANCEL" : "REQUEST";

  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Turkish Iraqi Gate//Portal//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${startStamp}`,
    `DTEND:${endStamp}`,
    `SEQUENCE:${input.sequence ?? Math.floor(Date.now() / 1000) % 2_147_483_647}`,
    `SUMMARY:${escapeText(input.summary)}`,
  ];

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  }
  if (input.location) {
    lines.push(`LOCATION:${escapeText(input.location)}`);
  }

  lines.push(
    `ORGANIZER;CN=Turkish Iraqi Gate:mailto:${input.organizer}`,
    ...input.attendees
      .filter(Boolean)
      .map(
        (address) =>
          `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${address}`,
      ),
    `STATUS:${input.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Interview reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  // Every line folded, CRLF-joined, trailing CRLF per the RFC.
  return `${lines.map(fold).join(CRLF)}${CRLF}`;
}

/** Resend takes base64 attachments; a `text/calendar` part is what clients read as an invite. */
export function calendarAttachment(ics: string): {
  filename: string;
  content: string;
  content_type: string;
} {
  return {
    filename: "interview.ics",
    content: Buffer.from(ics, "utf8").toString("base64"),
    content_type: "text/calendar",
  };
}
