import Image from "next/image";
import Link from "next/link";
import { databaseHealth } from "@/lib/db";
import { registerAction } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "Enter your name, a valid email and a password of at least 8 characters.",
  mismatch: "The two passwords do not match.",
  exists: "An account with that email already exists — sign in instead.",
  duplicate: "You already have a request waiting for review. An admin will reply soon.",
  throttle: "Too many attempts from this connection. Wait a few minutes and try again.",
  failed: "The request could not be saved. Try again.",
};

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const [{ error, sent }, health] = await Promise.all([searchParams, databaseHealth()]);
  const message = error ? (ERRORS[error] ?? "Something went wrong. Try again.") : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Image
            src="/logo.svg"
            alt="Turkish Iraqi Gate"
            width={230}
            height={66}
            priority
            className="mx-auto h-auto w-40"
          />
          <h1 className="mt-6 text-2xl font-bold text-[var(--primary)]">Join the TIGIP team</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Send a request to work with us. An administrator reviews every request and chooses
            the role before the account becomes active.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          {!health.ok ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-red-700">Requests are temporarily unavailable</p>
              <p>{health.reason ?? "The database could not be reached."}</p>
              <p className="text-xs text-[var(--muted)]">
                Try again shortly, or contact the office directly.
              </p>
            </div>
          ) : sent ? (
            <div className="space-y-4 text-sm">
              <p className="font-semibold text-[var(--primary)]">Request received</p>
              <p>
                Thanks — your request is in the admin queue. If it is approved you can sign in with
                the email and password you just chose.
              </p>
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white hover:bg-[var(--accent-light)]"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              {message ? (
                <p
                  role="alert"
                  className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {message}
                </p>
              ) : null}

              <form action={registerAction} className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium">
                    Full name <span className="text-red-600">*</span>
                  </label>
                  <input id="name" name="name" required maxLength={120} className={inputClass} />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    This becomes your sign-in address.
                  </p>
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                    Phone <span className="text-[var(--muted)]">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    maxLength={40}
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium">
                      Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
                      Confirm password <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="confirm"
                      name="confirm"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="mb-1 block text-sm font-medium">
                    What would you like to do? <span className="text-[var(--muted)]">(optional)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    maxLength={1000}
                    placeholder="Role, experience, or anything the admin should know."
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
                >
                  Send request
                </button>

                <p className="text-xs text-[var(--muted)]">
                  Your password is stored encrypted and is only used to create the account if the
                  request is approved.
                </p>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            Sign in
          </Link>
          <span className="mx-2 text-[var(--border)]">·</span>
          <Link href="/ar" className="text-[var(--accent)] hover:underline">
            tigip.com
          </Link>
        </p>
      </div>
    </main>
  );
}
