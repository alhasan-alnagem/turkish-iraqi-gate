import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../globals.css";
import { currentStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TIGIP — Staff portal",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");

  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[var(--section)] text-[var(--foreground)] antialiased">
        <header className="bg-[var(--primary)] text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.svg"
                alt="Turkish Iraqi Gate"
                width={230}
                height={66}
                className="h-8 w-auto rounded"
                priority
              />
              <nav className="flex items-center gap-1 text-sm">
                <Link href="/portal" className="rounded-lg px-3 py-1.5 hover:bg-white/10">
                  Orders
                </Link>
                {staff.role === "admin" ? (
                  <>
                    <Link href="/portal/staff" className="rounded-lg px-3 py-1.5 hover:bg-white/10">
                      Team
                    </Link>
                    <Link href="/admin" className="rounded-lg px-3 py-1.5 hover:bg-white/10">
                      Catalogues
                    </Link>
                    <Link href="/portal/import" className="rounded-lg px-3 py-1.5 hover:bg-white/10">
                      Import
                    </Link>
                  </>
                ) : null}
              </nav>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-white/70 sm:inline">
                {staff.name} · {staff.role === "admin" ? "admin" : "staff"}
              </span>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-white/30 px-3 py-1.5 text-white/90 hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
