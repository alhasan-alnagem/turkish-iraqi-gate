"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import {
  ADMIN_CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CatalogsByCategory,
  type CategoryKey,
} from "@/lib/catalog-types";
import { stampCatalogPdf } from "@/lib/stamp-pdf";

type Phase = "idle" | "stamping" | "uploading";

const MAX_BYTES = 100 * 1024 * 1024;

function humanSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CatalogManager({
  catalogs,
  blobReady,
}: {
  catalogs: CatalogsByCategory;
  blobReady: boolean;
}) {
  const router = useRouter();
  const selectId = useId();
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<CategoryKey>("medical-equipment");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const total = useMemo(
    () => CATEGORY_ORDER.reduce((sum, key) => sum + catalogs[key].length, 0),
    [catalogs],
  );

  const busy = phase !== "idle";

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    if (!blobReady) {
      setMessage({ kind: "error", text: "Blob storage is not configured for this deployment." });
      return;
    }

    setMessage(null);
    const list = Array.from(files);

    for (const file of list) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setMessage({ kind: "error", text: `${file.name} is not a PDF.` });
        continue;
      }
      if (file.size > MAX_BYTES) {
        setMessage({ kind: "error", text: `${file.name} is larger than 100 MB.` });
        continue;
      }

      try {
        setPending(file.name);
        setPhase("stamping");
        setProgress({ done: 0, total: 1 });

        // Watermark in the browser: the supplier's original never leaves this machine.
        const stamped = await stampCatalogPdf(file, (done, pages) =>
          setProgress({ done, total: pages }),
        );

        setPhase("uploading");
        const blob = new Blob([stamped as unknown as BlobPart], { type: "application/pdf" });

        await upload(`catalogs/${category}/${category}.pdf`, blob, {
          access: "public",
          handleUploadUrl: "/api/admin/blob-upload",
          contentType: "application/pdf",
          onUploadProgress: ({ percentage }) =>
            setProgress({ done: Math.round(percentage), total: 100 }),
        });

        setMessage({
          kind: "ok",
          text: `${file.name} published as ${ADMIN_CATEGORY_LABELS[category]}.`,
        });
      } catch (error) {
        const text = error instanceof Error ? error.message : "Upload failed.";
        setMessage({ kind: "error", text: `${file.name}: ${text}` });
      } finally {
        setPhase("idle");
        setProgress(null);
        setPending(null);
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(url: string, label: string) {
    if (deleting) return;
    if (!window.confirm(`Remove ${label} from tigip.com? This cannot be undone.`)) return;

    setDeleting(url);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/catalogs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Delete failed.");
      }
      setMessage({ kind: "ok", text: `${label} removed.` });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Delete failed.",
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Upload */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-[var(--primary)]">Add a catalog</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          The PDF is stamped with the bilingual logo, given a neutral file name, and published
          immediately. Supplier names are never exposed.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <label htmlFor={selectId} className="mb-2 block text-sm font-medium">
              Category
            </label>
            <select
              id={selectId}
              value={category}
              disabled={busy}
              onChange={(event) => setCategory(event.target.value as CategoryKey)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25"
            >
              {CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {ADMIN_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={fileId} className="mb-2 block text-sm font-medium">
              PDF file
            </label>
            <input
              id={fileId}
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              disabled={busy || !blobReady}
              onChange={(event) => void handleUpload(event.target.files)}
              className="w-full cursor-pointer rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--section)] file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {!blobReady ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            BLOB_READ_WRITE_TOKEN is missing, so uploads are disabled. Create a Blob store in
            Vercel and add the token to this deployment.
          </p>
        ) : null}

        {busy ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--section)] px-4 py-3 text-sm">
            <p className="font-medium text-[var(--primary)]">
              {phase === "stamping" ? "Stamping" : "Uploading"} {pending}
              {progress && progress.total > 0
                ? ` — ${Math.round((progress.done / progress.total) * 100)}%`
                : ""}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{
                  width: progress && progress.total > 0
                    ? `${Math.min(100, (progress.done / progress.total) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        ) : null}

        {message ? (
          <p
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              message.kind === "ok"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      {/* Current catalogs */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-[var(--primary)]">Published catalogs</h2>
          <span className="text-sm text-[var(--muted)]">
            {total} file{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {CATEGORY_ORDER.map((key) => {
            const entries = catalogs[key];
            return (
              <div
                key={key}
                className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--primary)]">
                    {ADMIN_CATEGORY_LABELS[key]}
                  </h3>
                  <span className="text-xs text-[var(--muted)]">{entries.length}</span>
                </div>

                {entries.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-[var(--border)] px-3 py-4 text-center text-sm text-[var(--muted)]">
                    No files yet
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--border)]">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {ADMIN_CATEGORY_LABELS[key]} {entry.index}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {entry.source === "repo" ? "in repo" : "uploaded"}
                            {entry.size ? ` · ${humanSize(entry.size)}` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <a
                            href={entry.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--section)]"
                          >
                            View
                          </a>
                          {entry.source === "blob" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(
                                  entry.href,
                                  `${ADMIN_CATEGORY_LABELS[key]} ${entry.index}`,
                                )
                              }
                              disabled={deleting === entry.href}
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deleting === entry.href ? "Removing…" : "Remove"}
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--muted)]" title="Committed to the repo — remove it there">
                              locked
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
