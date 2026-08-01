import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime, loadNotifications } from "@/lib/notifications";
import Avatar from "@/app/components/Avatar";
import EmptyState from "@/app/components/EmptyState";
import MarkNotificationsRead from "./MarkNotificationsRead";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Likes and saves on the work you've shared.",
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/notifications");
  }

  const notifications = await loadNotifications(supabase, user.id);
  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div>
      <MarkNotificationsRead unreadCount={unreadCount} />

      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-3xl">
          <span className="eyebrow text-sage">Activity</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Notifications
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
            {unreadCount > 0
              ? `${unreadCount} new ${unreadCount === 1 ? "note" : "notes"} since you were last here.`
              : "When someone likes or saves your work, it shows up here."}
          </p>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {notifications.length === 0 ? (
            <EmptyState
              mark="spark"
              eyebrow="All quiet"
              title="No activity yet"
              description="Likes and saves on your posts land here. Share something and give people work to find."
            >
              <Link href="/upload" className="btn-primary">
                Upload a Product
              </Link>
              <Link href="/explore" className="btn-secondary">
                Browse the feed
              </Link>
            </EmptyState>
          ) : (
            <ul className="animate-fade-in divide-y divide-sand overflow-hidden rounded-[1.5rem] border border-sand bg-cream shadow-soft">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-4 px-5 py-4 transition duration-200 sm:px-6 ${
                    item.read ? "" : "bg-terracotta-soft/25"
                  }`}
                >
                  <Avatar
                    name={item.actorName}
                    photoUrl={item.actorPhoto}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-ink">
                      {item.actorName ? (
                        <Link
                          href={`/profile/${encodeURIComponent(item.actorName)}`}
                          className="font-medium underline-offset-4 transition duration-200 hover:text-terracotta hover:underline"
                        >
                          {item.actorName}
                        </Link>
                      ) : (
                        <span className="font-medium">Someone</span>
                      )}{" "}
                      <span className="text-ink-muted">
                        {item.type === "like" ? "liked" : "saved"} your post
                      </span>{" "}
                      {item.postId && (
                        <Link
                          href={`/products/${item.postId}`}
                          className="font-medium text-terracotta underline-offset-4 transition duration-200 hover:underline"
                        >
                          “{item.postTitle ?? "Untitled product"}”
                        </Link>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      <span aria-hidden className="mr-1.5 text-terracotta/70">
                        {item.type === "like" ? "♥" : "★"}
                      </span>
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>

                  {!item.read && (
                    <span
                      title="New"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terracotta"
                    >
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
