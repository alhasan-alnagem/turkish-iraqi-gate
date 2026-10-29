"use client";

import { useState } from "react";

type TrackCopy = {
  refLabel: string;
  refPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  submit: string;
  checking: string;
  notFound: string;
  status: string;
  history: string;
  progress: string;
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

export default function TrackForm({ copy, lang }: { copy: TrackCopy; lang: "en" | "ar" | "tr" }) {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

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

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {copy.history}
          </h3>
          <ol className="mt-3 space-y-2">
            {result.history.map((event, index) => (
              <li key={`${event.status}-${index}`} className="flex items-center gap-3 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span className="font-medium">{event.label}</span>
                <span className="text-[var(--muted)]">
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(event.at))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
