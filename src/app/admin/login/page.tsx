import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TIGIP — Sign in",
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  const configured = adminConfigured();

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
          <h1 className="mt-6 text-2xl font-bold text-[var(--primary)]">Catalog manager</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Private area — upload and remove the catalog PDFs shown on tigip.com.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          {configured ? (
            <LoginForm />
          ) : (
            <div className="space-y-3 text-sm text-[var(--foreground)]">
              <p className="font-semibold text-[var(--primary)]">Not configured yet</p>
              <p className="text-[var(--muted)]">
                Add these environment variables in Vercel (Project → Settings → Environment
                Variables), then reload this page:
              </p>
              <ul className="space-y-1 rounded-lg bg-[var(--section)] p-3 font-mono text-xs">
                <li>ADMIN_PASSWORD</li>
                <li>ADMIN_SESSION_SECRET</li>
                <li>BLOB_READ_WRITE_TOKEN</li>
              </ul>
            </div>
          )}
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
