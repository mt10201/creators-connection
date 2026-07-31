import Link from "next/link";

export type DashboardView = "posts" | "liked" | "saved";

const tabs: { view: DashboardView; label: string; hint: string }[] = [
  { view: "posts", label: "Your Posts", hint: "Products you've published" },
  { view: "liked", label: "Liked", hint: "Posts you've liked" },
  { view: "saved", label: "Saved", hint: "Posts you've saved" },
];

/** `posts` is the default view, so it stays on the bare dashboard URL. */
export function dashboardHref(view: DashboardView) {
  return view === "posts" ? "/dashboard" : `/dashboard?view=${view}`;
}

export function parseDashboardView(raw?: string): DashboardView {
  return raw === "liked" || raw === "saved" ? raw : "posts";
}

type Props = {
  active: DashboardView;
  counts: Record<DashboardView, number>;
};

export default function DashboardTabs({ active, counts }: Props) {
  return (
    <nav
      aria-label="Your collections"
      // Scrolls rather than wrapping if the counts push it past a narrow screen.
      className="-mx-1 overflow-x-auto px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* A single track holding all three tabs reads as a switcher rather than
          three unrelated buttons. */}
      <div className="inline-flex gap-1 rounded-full border border-sand bg-parchment/70 p-1 shadow-soft">
        {tabs.map((tab) => {
          const isActive = tab.view === active;

          return (
            <Link
              key={tab.view}
              href={dashboardHref(tab.view)}
              aria-current={isActive ? "page" : undefined}
              title={tab.hint}
              className={`chip gap-2 border-transparent ${
                isActive
                  ? "bg-terracotta font-medium text-cream shadow-soft"
                  : "text-ink-muted hover:bg-cream hover:text-terracotta"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  isActive ? "bg-cream/20 text-cream" : "bg-sand/70 text-ink-faint"
                }`}
              >
                {counts[tab.view]}
              </span>
              <span className="sr-only">{tab.hint}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
