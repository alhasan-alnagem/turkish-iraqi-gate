import Link from "next/link";
import { createOrderAction } from "../../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "missing-contact": "A customer name and phone number are required.",
  "create-failed": "The order could not be saved. Try again.",
};

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Something went wrong. Try again.") : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-[var(--accent)] hover:underline">
          ← All orders
        </Link>
        <h1 className="mt-1 text-xl font-bold text-[var(--primary)]">New order</h1>
        <p className="text-sm text-[var(--muted)]">
          For orders that arrive by phone, WhatsApp or in person. The customer gets a tracking
          number as soon as you save.
        </p>
      </div>

      <form
        action={createOrderAction}
        className="grid gap-5 rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 lg:grid-cols-2"
      >
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Customer name <span className="text-red-600">*</span>
          </label>
          <input id="name" name="name" required maxLength={120} className={inputClass} />
        </div>

        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium">
            Phone <span className="text-red-600">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={40}
            placeholder="0780 000 0000"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            The customer must type this exact number to track the order.
          </p>
        </div>

        <div>
          <label htmlFor="city" className="mb-2 block text-sm font-medium">
            City
          </label>
          <input id="city" name="city" maxLength={80} className={inputClass} />
        </div>

        <div>
          <label htmlFor="product" className="mb-2 block text-sm font-medium">
            Product
          </label>
          <input id="product" name="product" maxLength={200} className={inputClass} />
        </div>

        <div>
          <label htmlFor="quantity" className="mb-2 block text-sm font-medium">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            maxLength={60}
            placeholder="e.g. 20 units"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
          <div>
            <label htmlFor="budget" className="mb-2 block text-sm font-medium">
              Budget
            </label>
            <input
              id="budget"
              name="budget"
              inputMode="decimal"
              maxLength={40}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="currency" className="mb-2 block text-sm font-medium">
              Currency
            </label>
            <select id="currency" name="currency" defaultValue="USD" className={inputClass}>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="shipping" className="mb-2 block text-sm font-medium">
            Shipping needed
          </label>
          <select id="shipping" name="shipping" defaultValue="no" className={inputClass}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="details" className="mb-2 block text-sm font-medium">
            Notes / request details
          </label>
          <textarea id="details" name="details" rows={4} maxLength={4000} className={inputClass} />
        </div>

        {message ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2"
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-light)]"
          >
            Create order
          </button>
          <Link href="/portal" className="text-sm text-[var(--muted)] hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
