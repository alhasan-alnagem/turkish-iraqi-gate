import Image from "next/image";
import { redirect } from "next/navigation";
import CatalogManager from "@/components/admin/CatalogManager";
import { isAdmin } from "@/lib/auth";
import { blobConfigured, listCatalogsByCategory } from "@/lib/catalogs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TIGIP â€” Catalog Manager",
};

const WEBMAIL_URL = "https://privateemail.com/";

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/login");

  const [catalogs, blobReady] = await Promise.all([
    listCatalogsByCategory(),
    Promise.resolve(blobConfigured()),
  ]);

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--primary)] text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.svg"
              alt="Turkish Iraqi Gate"
              width={230}
              height={66}
              className="h-9 w-auto rounded"
              priority
            />
            <span className="hidden text-sm font-medium text-white/80 sm:inline">
              Catalog manager
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={WEBMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              âœ‰ Open PrivateEmail
            </a>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-[var(--primary)]">Booking the mailbox</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Email stays on Namecheap Private Email â€” the site never sees or stores your mailbox
            password. Use the button above to open PrivateEmail in a new tab and sign in there as
            usual; your browser can remember it.
          </p>
        </section>

        <CatalogManager catalogs={catalogs} blobReady={blobReady} />

        <p className="pb-6 text-center text-xs text-[var(--muted)]">
          Signed in as administrator Â· changes go live immediately Â· session expires after 8 hours
        </p>
      </main>
    </div>
  );
}
