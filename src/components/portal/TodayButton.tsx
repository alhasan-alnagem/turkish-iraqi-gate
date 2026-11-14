"use client";

/**
 * The office clock, not the visitor's: a staff member abroad must still get the
 * Baghdad date. Kept local because `src/lib/application-mail.ts` is server-only.
 */
const OFFICE_TZ = "Asia/Baghdad";

/** `en-CA` formats as YYYY-MM-DD, which is what `<input type="date">` expects. */
function todayInOffice(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Fills a `<input type="date">` with today's office date. Never submits the form. */
export default function TodayButton({
  inputId,
  label = "Today",
}: {
  inputId: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        if (!input) return;
        const value = todayInOffice();
        // React tracks the DOM value itself, so go through the native setter and
        // fire the events React listens to, otherwise the form would submit empty.
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        if (setter) setter.call(input, value);
        else input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }}
      className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--section)]"
    >
      {label}
    </button>
  );
}
