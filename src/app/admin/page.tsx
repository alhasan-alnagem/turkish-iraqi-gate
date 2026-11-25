import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import CatalogManager from "@/components/admin/CatalogManager";
import CategoryManager from "@/components/admin/CategoryManager";
import BannerManager from "@/components/admin/BannerManager";
import { isAdmin } from "@/lib/auth";
import { blobConfigured, listCatalogsByCategory } from "@/lib/catalogs";
import { getBanners, getManagedCategories } from "@/lib/catalog-settings";
import type { CatalogNoticeDefaults } from "@/lib/catalog-settings-shared";
import { WEBMAIL_URL } from "@/lib/mailbox";
import { getTranslations } from "@/lib/translations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TIGIP — Catalog Manager",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; tab?: string }>;
}) {
  if (!(await isAdmin())) redirect("/login");
  const params = await searchParams;

  // The manager needs hidden repo PDFs too, so they can be restored. Category
  // counts stay public-facing: hidden files do not block category deletion.
  const catalogs = await listCatalogsByCategory({ includeHidden: true });
  const fileCounts: Record<string, number> = Object.fromEntries(
    Object.entries(catalogs).map(([key, entries]) => [
      key,
      entries.filter((entry) => !entry.hidden).length,
    ]),
  );
  const [categories, banners] = await Promise.all([
    getManagedCategories(fileCounts),
    getBanners(),
  ]);
  const blobReady = blobConfigured();

  const noticeDefaults: CatalogNoticeDefaults = {
    title: {
      en: getTranslations("en").catalogs.notice.title,
      ar: getTranslations("ar").catalogs.notice.title,
      tr: getTranslations("tr").catalogs.notice.title,
    },
    message: {
      en: getTranslations("en").catalogs.notice.message,
      ar: getTranslations("ar").catalogs.notice.message,
      tr: getTranslations("tr").catalogs.notice.message,
    },
  };

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--primary)] text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/portal"
              aria-label="Orders dashboard"
              className="rounded transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.svg"
                alt="Turkish Iraqi Gate"
                width={230}
                height={66}
                className="h-9 w-auto rounded"
                priority
              />
            </Link>
            <span className="hidden text-sm font-medium text-white/80 sm:inline">
              Catalog manager
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:inline"
            >
              Orders
            </Link>
            <a
              href={WEBMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              PrivateEmail
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
            Email stays on Namecheap Private Email — the site never sees or stores your mailbox
            password. Use the button above to open PrivateEmail in a new tab and sign in there as
            usual; your browser can remember it.
          </p>
        </section>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-[var(--foreground)]">Admin tools</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="#categories"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--section)]"
            >
              Categories
            </a>
            <a
              href="#banners"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--section)]"
            >
              Banners
            </a>
            <a
              href="#catalogs"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--section)]"
            >
              Catalog PDFs
            </a>
          </div>
        </div>

        {params.error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error.replace(/-/g, " ")}
          </p>
        ) : null}
        {params.ok ? (
          <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {params.ok.replace(/-/g, " ")}
          </p>
        ) : null}

        <div id="banners">
          <BannerManager banners={banners} defaults={noticeDefaults} />
        </div>
        <div id="categories">
          <CategoryManager categories={categories} />
        </div>
        <div id="catalogs">
          <CatalogManager catalogs={catalogs} categories={categories} blobReady={blobReady} />
        </div>

        <p className="pb-6 text-center text-xs text-[var(--muted)]">
          Signed in as administrator · changes go live immediately · sessions last 8 hours, or 30
          days with &ldquo;Remember me&rdquo;
        </p>
      </main>
    </div>
  );
}
