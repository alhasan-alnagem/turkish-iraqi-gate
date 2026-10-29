import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { importOrdersAction } from "../actions";

export const dynamic = "force-dynamic";

type Search = { created?: string; skipped?: string; failed?: string; error?: string };

export default async function ImportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await currentStaff();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/portal");

  const params = await searchParams;
  const ran = params.created !== undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--primary)]">Import the Google Sheet</h1>
        <p className="text-sm text-[var(--muted)]">
          One-off import of orders that were submitted before the portal existed. Export the sheet as
          CSV and upload it here; re-uploading the same file will not duplicate anything.
        </p>
      </div>

      {ran ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Imported <strong>{params.created}</strong>, skipped{" "}
          <strong>{params.skipped ?? 0}</strong> already present
          {params.failed && params.failed !== "0" ? (
            <>
              , <strong className="text-amber-700">{params.failed} failed</strong>
            </>
          ) : null}
          .
        </div>
      ) : null}

      {params.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Choose a CSV file first.
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Expected columns
        </h2>
        <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--foreground)]">
          # | Name | Phone | Product | Quantity | Budget | Currency | Shipping | City | Details |
          Language | Received At
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          In Google Sheets: File → Download → Comma separated values (.csv). A header row is fine.
          Orders arrive with status “received” and keep the original received date, so the history
          and analytics stay honest. Assign them to a team member afterwards.
        </p>

        <form action={importOrdersAction} className="mt-5 space-y-3">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--section)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-light)]"
          >
            Import orders
          </button>
        </form>
      </section>
    </div>
  );
}
