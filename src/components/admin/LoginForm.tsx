"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ suggestedEmail = "" }: { suggestedEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(suggestedEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }

      router.replace("/portal");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
        />
        <label htmlFor="remember" className="text-sm text-[var(--muted)]">
          Remember me on this device
          <span className="block text-xs">Stay signed in for 30 days</span>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
