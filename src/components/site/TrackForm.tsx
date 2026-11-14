"use client";

import { useState } from "react";

type TrackCopy = {
  refLabel: string;
  refPlaceholder: string;
  refExample: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneExample: string;
  submit: string;
  checking: string;
  notFound: string;
  status: string;
  history: string;
  progress: string;
  updated: string;
  whatsapp: string;
  /** `{ref}` is replaced with the order number that was just found. */
  whatsappMessage: string;
};

type TrackResult = {
  order: {
    ref: string;
    name: string;
    product: string;
    status: string;
    statusLabel: string;
    step: number;
    totalSteps: number;
    updatedAt: string;
  };
  history: { status: string; label: string; at: string }[];
};

export default function TrackForm({
  copy,
  lang,
  whatsapp,
}: {
  copy: TrackCopy;
  lang: "en" | "ar" | "tr";
  /** Digits for wa.me, e.g. "9647866417123". */
  whatsapp: string;
}) {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  // Locale-aware month names, but always Latin digits so the timestamp lines up
  // with the order reference and phone number the customer just typed.
  const stampFormat = new Intl.DateTimeFormat(`${lang === "ar" ? "ar-IQ" : lang === "tr" ? "tr-TR" : "en-GB"}-u-nu-latn`, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const stamp = (value: string) => stampFormat.format(new Date(value));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, phone, lang }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? copy.notFound);
      } else {
        setResult(payload as TrackResult);
      }
    } catch {
      setError(copy.notFound);
    } finally {
      setBusy(false);
    }
  }

  const percent = result
    ? Math.round((result.order.step / Math.max(result.order.totalSteps, 1)) * 100)
    : 0;

  // The customer's order number goes into the message so support can find the
  // order without asking for it again.
  const whatsappHref = result
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        copy.whatsappMessage.replace("{ref}", result.order.ref),
      )}`
    : "";

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <div>
          <label htmlFor="ref" className="mb-2 block text-sm font-medium">
            {copy.refLabel}
          </label>
          <input
            id="ref"
            value={ref}
            onChange={(event) => setRef(event.target.value)}
            placeholder={copy.refPlaceholder}
            required
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25"
          />
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]" dir="auto">
            {copy.refExample}
          </p>
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium">
            {copy.phoneLabel}
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={copy.phonePlaceholder}
            required
            inputMode="tel"
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25"
          />
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]" dir="auto">
            {copy.phoneExample}
          </p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="h-[50px] rounded-lg bg-[var(--accent)] px-6 font-semibold text-white transition-colors hover:bg-[var(--accent-light)] disabled:opacity-60"
        >
          {busy ? copy.checking : copy.submit}
        </button>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-mono text-sm text-[var(--muted)]">{result.order.ref}</p>
              <h2 className="text-xl font-bold text-[var(--primary)]">{result.order.statusLabel}</h2>
              <p className="text-sm text-[var(--muted)]">
                {result.order.product || "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {copy.updated}: <span className="font-mono">{stamp(result.order.updatedAt)}</span>
              </p>
            </div>
            <span className="text-sm font-medium text-[var(--accent)]">
              {result.order.step} / {result.order.totalSteps}
            </span>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--section)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1fa855]"
          >
            <WhatsAppIcon />
            <span dir="auto">{copy.whatsapp}</span>
          </a>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {copy.history}
          </h3>
          <ol className="mt-3 space-y-2">
            {result.history.map((event, index) => (
              <li
                key={`${event.status}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--border)] pb-2 text-sm last:border-0 last:pb-0"
              >
                <span className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="font-medium">{event.label}</span>
                </span>
                <time dateTime={event.at} className="font-mono text-xs text-[var(--muted)]">
                  {stamp(event.at)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.93-2.24-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.03 1-1.03 2.45 0 1.44 1.05 2.84 1.2 3.04.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.11.56-.08 1.73-.71 1.98-1.39.24-.68.24-1.27.17-1.39-.07-.12-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.34-1.4a9.84 9.84 0 0 0 4.7 1.2c5.44 0 9.86-4.42 9.86-9.86 0-2.63-1.03-5.11-2.9-6.97A9.79 9.79 0 0 0 12.04 2Zm0 18.02a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.13 8.13 0 0 1-1.25-4.32 8.19 8.19 0 0 1 8.2-8.18 8.15 8.15 0 0 1 8.18 8.19c0 4.52-3.67 8.15-8.18 8.15Z" />
    </svg>
  );
}
