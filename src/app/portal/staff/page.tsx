import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { listStaff } from "@/lib/staff";
import { createStaffAction, removeStaffAction, updateStaffAction } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "missing-fields": "Name, a valid email and a password of at least 8 characters are required.",
  "duplicate-email": "That email already has an account.",
  "create-failed": "Could not create the account.",
  "last-admin": "There must always be at least one administrator.",
  "self-delete": "You cannot remove your own account.",
  "not-found": "That account no longer exists.",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await currentStaff();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/portal");

  const [{ error }, staff] = await Promise.all([searchParams, listStaff()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--primary)]">Team</h1>
        <p className="text-sm text-[var(--muted)]">
          Everyone here can see and move orders. Only admins can manage catalogues and this team.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {ERRORS[error] ?? "Something went wrong."}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Add a team member
        </h2>
        <form action={createStaffAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Full name"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Work email"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Temporary password (8+ characters)"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <select
            name="role"
            defaultValue="staff"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="staff">Staff — orders only</option>
            <option value="admin">Admin — orders, team, catalogues</option>
          </select>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
            >
              Create account
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <h2 className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Accounts
        </h2>
        <ul className="divide-y divide-[var(--border)]">
          {staff.map((member) => (
            <li key={member.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
              <form action={updateStaffAction} className="grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="staffId" value={member.id} />
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Name</label>
                  <input
                    name="name"
                    defaultValue={member.name}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">{member.email}</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Role</label>
                  <select
                    name="role"
                    defaultValue={member.role}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    New password
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="Leave blank to keep"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--section)]"
                  >
                    Save
                  </button>
                </div>
              </form>

              <form action={removeStaffAction} className="lg:pt-6">
                <input type="hidden" name="staffId" value={member.id} />
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
