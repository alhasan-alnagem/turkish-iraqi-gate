"use client";

import { deleteApplicationAction } from "@/app/portal/actions";

export default function DeleteApplicationButton({
  applicationId,
  name,
}: {
  applicationId: string;
  name: string;
}) {
  return (
    <form
      action={deleteApplicationAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete ${name}'s application permanently?\n\nThe CV stored with it is removed too. This cannot be undone.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
