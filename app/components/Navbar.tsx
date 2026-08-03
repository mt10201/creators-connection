import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { countUnreadNotifications } from "@/lib/notifications";
import { loadWallet, type Wallet } from "@/lib/wallet";
import Avatar from "./Avatar";
import CreditWallet from "./CreditWallet";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/#about", label: "About" },
];

async function getViewer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Profile, wallet, and unread count are independent: one failure must not
  // hide the rest of the signed-in chrome (including the bell itself).
  const [{ data: profile }, unreadNotifications] = await Promise.all([
    supabase
      .from("users")
      .select("username, credit_balance, profile_photo")
      .eq("id", user.id)
      .maybeSingle(),
    countUnreadNotifications(supabase, user.id).catch((error) => {
      console.error("Failed to count notifications:", error);
      return 0;
    }),
  ]);

  const wallet = await loadWallet(supabase, profile?.credit_balance ?? 0).catch(
    (error) => {
      console.error("Failed to load wallet:", error);
      return null;
    }
  );

  return {
    displayName:
      profile?.username?.trim() ||
      (user.user_metadata?.username as string | undefined) ||
      user.email ||
      "Creator",
    wallet:
      wallet ??
      ({
        spendable: profile?.credit_balance ?? 0,
        vesting: 0,
        total: profile?.credit_balance ?? 0,
        transactions: [],
      } satisfies Wallet),
    photoUrl: profile?.profile_photo?.trim() || null,
    unreadNotifications,
  };
}

const linkClass =
  "inline-flex min-h-10 items-center text-sm text-ink-muted underline-offset-8 transition duration-200 hover:text-terracotta hover:underline";

const mobileLinkClass =
  "flex min-h-11 items-center px-4 text-sm text-ink-muted transition duration-200 hover:bg-parchment hover:text-terracotta";

export default async function Navbar() {
  const viewer = await getViewer();
  const isLoggedIn = viewer !== null;
  const displayName = viewer?.displayName ?? "";
  const wallet = viewer?.wallet ?? null;
  const photoUrl = viewer?.photoUrl ?? null;
  const unreadNotifications = viewer?.unreadNotifications ?? 0;

  return (
    <header className="sticky top-0 z-50 border-b border-sand/80 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8 sm:py-4">
        <Link href="/" className="group flex min-h-11 shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta font-display text-sm font-semibold text-cream transition duration-200 group-hover:bg-terracotta-deep">
            cc
          </span>
          <span className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Creators Connection
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex lg:gap-9">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          {isLoggedIn && (
            <>
              {/* Liked and saved posts live in the dashboard's own tabs. */}
              <Link href="/dashboard" className={linkClass}>
                Dashboard
              </Link>
              <Link href="/upload" className={linkClass}>
                Upload
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {/* Bell stays outside the sm-only profile cluster so mobile sees it
                  without opening the menu. Desktop sees it too. */}
              <NotificationBell unreadCount={unreadNotifications} />
              <div className="hidden items-center gap-3 sm:flex">
                <Link
                  href="/settings"
                  aria-label={`Account settings for ${displayName}`}
                  title="Account settings"
                  className="group flex min-h-10 items-center gap-2 rounded-full py-1 text-sm text-ink transition duration-200 hover:text-terracotta"
                >
                  <Avatar
                    name={displayName}
                    photoUrl={photoUrl}
                    size="sm"
                    className="transition duration-200 group-hover:border-terracotta/40"
                  />
                  <span className="max-w-[9rem] truncate underline-offset-4 group-hover:underline">
                    {displayName}
                  </span>
                </Link>
                {wallet && <CreditWallet wallet={wallet} />}
                <LogoutButton />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-4 sm:flex">
              <Link href="/login" className={linkClass}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-10 items-center rounded-full bg-terracotta px-5 text-sm font-medium text-cream shadow-soft transition duration-200 ease-out hover:bg-terracotta-deep hover:shadow-lift active:translate-y-px"
              >
                Join Free
              </Link>
            </div>
          )}

          {/* Mobile menu */}
          <details className="relative md:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-sand bg-cream text-ink-muted transition duration-200 hover:border-terracotta/40 hover:text-terracotta [&::-webkit-details-marker]:hidden">
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
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
              <span className="sr-only">Open menu</span>
            </summary>
            <nav className="animate-fade-in absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-sand bg-cream py-2 shadow-lift">
              {isLoggedIn && (
                <div className="border-b border-sand px-4 pb-3 pt-2">
                  <Link
                    href="/settings"
                    aria-label={`Account settings for ${displayName}`}
                    className="flex items-center gap-2.5 rounded-xl py-1 transition duration-200 hover:text-terracotta"
                  >
                    <Avatar name={displayName} photoUrl={photoUrl} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink underline-offset-4 hover:underline">
                        {displayName}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        Account settings →
                      </span>
                    </span>
                  </Link>
                  {wallet && (
                    <div className="mt-2.5">
                      <span className="inline-flex rounded-full border border-ochre/30 bg-ochre/10 px-2.5 py-1 text-xs font-semibold text-ochre">
                        {wallet.spendable} spendable
                      </span>
                      <p className="mt-1.5 text-xs text-ink-faint">
                        {wallet.vesting > 0
                          ? `${wallet.vesting} vesting · `
                          : ""}
                        <Link
                          href="/how-it-works#credits"
                          className="text-terracotta underline-offset-4 hover:underline"
                        >
                          How credits work
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={mobileLinkClass}
                >
                  {link.label}
                </Link>
              ))}

              {isLoggedIn && (
                <>
                  <Link href="/dashboard" className={mobileLinkClass}>
                    Dashboard
                  </Link>
                  <Link
                    href="/notifications"
                    className={`${mobileLinkClass} justify-between gap-3`}
                  >
                    Notifications
                    {unreadNotifications > 0 && (
                      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-terracotta px-1.5 py-0.5 text-[0.625rem] font-semibold leading-none text-cream">
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </span>
                    )}
                  </Link>
                  <Link href="/upload" className={mobileLinkClass}>
                    Upload
                  </Link>
                </>
              )}

              <div className="mt-2 space-y-2 border-t border-sand px-4 pt-3">
                {isLoggedIn ? (
                  <LogoutButton className="w-full" />
                ) : (
                  <>
                    <Link href="/login" className="btn-secondary w-full">
                      Log in
                    </Link>
                    <Link href="/signup" className="btn-primary w-full">
                      Join Free
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
