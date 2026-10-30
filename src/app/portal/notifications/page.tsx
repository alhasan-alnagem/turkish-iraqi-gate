import { redirect } from "next/navigation";
import ActivityFeed from "@/components/portal/ActivityFeed";
import { currentStaff } from "@/lib/auth";
import { listNotifications, markNotificationsSeen } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/login");

  const entries = await listNotifications(100);

  // Opening the feed clears the badge for this member only; everyone else keeps
  // their own unread count.
  await markNotificationsSeen(staff.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--primary)]">Notifications</h1>
        <p className="text-sm text-[var(--muted)]">
          Every order change the team makes, newest first. Opening this page marks it all as read
          for you.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <ActivityFeed entries={entries} />
      </section>
    </div>
  );
}
