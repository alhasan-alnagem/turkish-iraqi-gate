import "server-only";

import { query } from "@/lib/db";

export type NotificationKind = "order_created" | "status_changed" | "assigned" | "deleted";

export type Notification = {
  id: string;
  order_id: string | null;
  order_ref: string;
  kind: NotificationKind;
  summary: string;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
  order_exists?: boolean;
};

/**
 * The internal activity feed. Nothing here may break an order operation, so a
 * failed insert is logged and swallowed.
 */
export async function notify(entry: {
  kind: NotificationKind;
  summary: string;
  orderId?: string | null;
  orderRef?: string;
  actorId?: string | null;
  actorName?: string | null;
}): Promise<void> {
  try {
    await query(
      `insert into notifications (order_id, order_ref, kind, summary, actor_id, actor_name)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        entry.orderId ?? null,
        entry.orderRef ?? "",
        entry.kind,
        entry.summary,
        entry.actorId ?? null,
        entry.actorName ?? null,
      ],
    );
  } catch (error) {
    console.error("could not record notification:", error);
  }
}

export async function listNotifications(limit = 100): Promise<Notification[]> {
  return query<Notification>(
    `select n.id, n.order_id, n.order_ref, n.kind, n.summary, n.actor_id, n.actor_name,
            n.created_at, (o.id is not null) as order_exists
     from notifications n
     left join orders o on o.id = n.order_id
     order by n.created_at desc
     limit $1`,
    [Math.min(limit, 200)],
  );
}

/**
 * Unread = newer than this member's last visit to the feed, ignoring their own
 * actions (nobody needs a badge for their own click).
 */
export async function unreadNotificationCount(staffId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*)::text as count
     from notifications n
     where n.created_at > coalesce(
             (select notifications_seen_at from staff where id = $1),
             to_timestamp(0)
           )
       and (n.actor_id is null or n.actor_id <> $1)`,
    [staffId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markNotificationsSeen(staffId: string): Promise<void> {
  await query("update staff set notifications_seen_at = now() where id = $1", [staffId]);
}
