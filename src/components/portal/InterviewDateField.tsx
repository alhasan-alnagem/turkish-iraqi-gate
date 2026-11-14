"use client";

import { useRef } from "react";

/**
 * The office clock, not the visitor's: a staff member abroad must still get the
 * Baghdad date. Kept local because `src/lib/application-mail.ts` is server-only.
 */
const OFFICE_TZ = "Asia/Baghdad";

function pad(value: string): string {
  return value.padStart(2, "0");
}

/** Today's office date as `dd/mm/yyyy`. */
function todayInOffice(): string {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Keeps the field day-first while it is typed: digits only, slashes inserted.
 * A pasted `2026-11-14` is accepted too, so nobody has to retype it.
 */
function asDayFirst(value: string): string {
  const pasted = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (pasted) {
    const [, year, month, day] = pasted;
    return `${pad(day)}/${pad(month)}/${year}`;
  }
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join("/");
}

/**
 * Interview date field: a plain text box so it always reads `dd/mm/yyyy`
 * (a native `<input type="date">` follows the browser's own locale, which is
 * `mm/dd/yyyy` on many machines and cannot be overridden).
 */
export default function InterviewDateField({
  id,
  name,
  defaultValue,
  className,
  label,
}: {
  id: string;
  name: string;
  defaultValue: string;
  className: string;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  const fill = (value: string) => {
    const el = input.current;
    if (!el) return;
    // Go through the native setter so React's form state follows the change.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-xs text-[var(--muted)]">
          {label}
        </label>
        <button
          type="button"
          onClick={() => fill(todayInOffice())}
          className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--section)]"
        >
          Today
        </button>
      </div>
      <input
        ref={input}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="dd/mm/yyyy"
        defaultValue={defaultValue}
        onInput={(event) => {
          const el = event.currentTarget;
          const next = asDayFirst(el.value);
          if (next !== el.value) el.value = next;
        }}
        className={`mt-1 ${className}`}
      />
    </div>
  );
}
