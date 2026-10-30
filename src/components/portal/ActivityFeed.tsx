import Link from "next/link";
import type { Notification } from "@/lib/notifications";

function timeAgo(value: string | Date): string {
  const then = new Date(value).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const DOT: Record<string, string> = {
  order_created: "bg-[var(--accent)]",
  status_changed: "bg-blue-500",
  assigned: "bg-amber-500",
  deleted: "bg-red-500",
};

/**
 * One shared renderer for the full Notifications tab and the compact
 * "Recent activity" card on the dashboard, so the two never drift apart.
 */
export default function ActivityFeed({
  entries,
  compact = false,
}: {
  entries: Notification[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-[var(--muted)]">
        Nothing yet. Changes to orders show up here for the whole team.
      </p>
    );
  }

  return (
    <ul className={compact ? "divide-y divide-[var(--border)]" : "divide-y divide-[var(--border)]"}>
      {entries.map((entry) => (
        <li key={entry.id} className={compact ? "px-5 py-3" : "px-5 py-4"}>
          <div className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                DOT[entry.kind] ?? "bg-[var(--muted)]"
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--foreground)]">
                {entry.order_exists && entry.order_id ? (
                  <Link
                    href={`/portal/orders/${entry.order_id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {entry.summary}
                  </Link>
                ) : (
                  <span className="font-medium">{entry.summary}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {entry.actor_name ?? "Website"} · {timeAgo(entry.created_at)}
                {entry.order_ref && !entry.order_exists ? ` · ${entry.order_ref} was removed` : ""}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
