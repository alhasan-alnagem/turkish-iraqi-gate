"use client";

import { deleteOrderAction } from "@/app/portal/actions";

export default function DeleteOrderButton({
  orderId,
  reference,
}: {
  orderId: string;
  reference: string;
}) {
  return (
    <form
      action={deleteOrderAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete ${reference} permanently?\n\nThe order, its timeline and its tracking number will be removed. This cannot be undone.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Delete order
      </button>
    </form>
  );
}
