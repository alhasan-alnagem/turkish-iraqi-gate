import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { currentStaff } from "@/lib/auth";
import { adminExists } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentStaff()) redirect("/portal");

  let firstRun = false;
  let dbDown = false;
  try {
    firstRun = !(await adminExists());
  } catch {
    dbDown = true;
  }

  const suggestedEmail = firstRun ? (process.env.ADMIN_EMAIL ?? "alhasan.alnagem@tigip.com") : "";

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
          {dbDown ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-red-700">Database not reachable</p>
              <p className="text-[var(--muted)]">
                Set <code className="font-mono text-xs">DATABASE_URL</code> in the environment, then
                reload this page.
              </p>
            </div>
          ) : (
            <LoginForm suggestedEmail={suggestedEmail} />
          )}

          {firstRun && !dbDown ? (
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
