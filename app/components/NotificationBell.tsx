import Link from "next/link";

type Props = {
  unreadCount: number;
  className?: string;
};

export default function NotificationBell({ unreadCount, className }: Props) {
  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition duration-200 ease-out active:translate-y-px ${
        hasUnread
          ? "animate-bell-pulse border-terracotta/35 bg-terracotta-soft/40 text-terracotta-deep hover:border-terracotta/60"
          : "border-sand bg-cream text-ink-muted hover:border-terracotta/40 hover:text-terracotta"
      } ${className ?? ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a24 24 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24 24 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>

      {hasUnread && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-terracotta px-1 py-0.5 text-[0.625rem] font-semibold leading-none text-cream shadow-soft"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
