import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { currentStaff } from "@/lib/auth";
import { databaseEnvPresence, databaseHealth, databaseVariableName } from "@/lib/db";
import { adminExists } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentStaff()) redirect("/portal");

  let firstRun = false;
  let dbProblem: { reason: string; using: string | null } | null = null;

  const health = await databaseHealth();

  if (!health.ok) {
    dbProblem = { reason: health.reason ?? "The database could not be reached.", using: databaseVariableName() };
  } else {
    try {
      firstRun = !(await adminExists());
    } catch {
      dbProblem = { reason: health.reason ?? "The database schema could not be read.", using: databaseVariableName() };
    }
  }

  const suggestedEmail = firstRun ? (process.env.ADMIN_EMAIL ?? "alhasan.alnagem@tigip.com") : "";
  const presence = databaseEnvPresence().filter((entry) => entry.present);
  const environment = process.env.VERCEL_ENV ?? (process.env.VERCEL ? "vercel" : "local");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.svg"
            alt="Turkish Iraqi Gate"
            width={230}
            height={66}
            priority
            className="mx-auto h-auto w-40"
          />
          <h1 className="mt-6 text-2xl font-bold text-[var(--primary)]">Staff sign in</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Orders, shipments and catalogues — for TIGIP staff only.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          {dbProblem ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-red-700">Database not reachable</p>
              <p className="text-[var(--foreground)]">{dbProblem.reason}</p>

              <dl className="space-y-1 rounded-lg bg-[var(--section)] p-3 text-xs text-[var(--muted)]">
                <div className="flex justify-between gap-3">
                  <dt>Environment</dt>
                  <dd className="font-mono">{environment}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>In use</dt>
                  <dd className="font-mono">{dbProblem.using ?? "none"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Variables found</dt>
                  <dd className="text-right font-mono">
                    {presence.length ? presence.map((entry) => entry.name).join(", ") : "none"}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-[var(--muted)]">
                Vercel → Project → Settings → Environment Variables. A Neon store attached through
                Storage usually injects <code className="font-mono">DATABASE_URL</code> or{" "}
                <code className="font-mono">POSTGRES_URL</code>; tick both <strong>Preview</strong>{" "}
                and <strong>Production</strong>, then redeploy.
              </p>
            </div>
          ) : (
            <LoginForm suggestedEmail={suggestedEmail} />
          )}

          {firstRun && !dbProblem ? (
            <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              First sign-in: use <strong>{suggestedEmail}</strong> with the{" "}
              <code className="font-mono">ADMIN_PASSWORD</code> you set in Vercel. You can add your
              team afterwards.
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link href="/ar" className="text-[var(--accent)] hover:underline">
            ← Back to tigip.com
          </Link>
        </p>
      </div>
    </main>
  );
}
