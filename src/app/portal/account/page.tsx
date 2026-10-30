import { currentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { changeOwnPasswordAction } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "wrong-current": "That is not your current password.",
  short: "The new password must be at least 8 characters.",
  mismatch: "The two new passwords do not match.",
  unchanged: "The new password is the same as the current one.",
  "too-many": "Too many attempts. Wait a few minutes and try again.",
};

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; changed?: string }>;
}) {
  const [{ error, changed }, staff] = await Promise.all([searchParams, currentStaff()]);
  if (!staff) redirect("/login");

  const message = error ? (ERRORS[error] ?? "Could not change the password.") : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--primary)]">My account</h1>
        <p className="text-sm text-[var(--muted)]">
          {staff.name} · {staff.email} · {staff.role === "admin" ? "administrator" : "staff"}
        </p>
      </div>

      {changed ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Password updated. Use the new one the next time you sign in — this browser stays signed
          in.
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Change password
        </h2>
        <p className="mt-2 text-xs text-[var(--muted)]">
          At least 8 characters. You will keep working in this tab; other devices stay signed in
          until their session expires.
        </p>

        <form action={changeOwnPasswordAction} className="mt-4 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
              Repeat new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </div>

          {message ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-light)]"
          >
            Update password
          </button>
        </form>
      </section>

      <p className="text-xs text-[var(--muted)]">
        {staff.role === "admin"
          ? "You can also reset the password of anyone on the team from the Team page."
          : "Forgot your current password? Ask an administrator to give you a new one from the Team page."}
      </p>
    </div>
  );
}
