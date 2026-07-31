import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

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

  const { data: profile } = await supabase
    .from("users")
    .select("username, credit_balance")
    .eq("id", user.id)
    .maybeSingle();

  return {
    displayName:
      profile?.username?.trim() ||
      (user.user_metadata?.username as string | undefined) ||
      user.email ||
      "Creator",
    creditBalance: profile?.credit_balance ?? 0,
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
  const creditBalance = viewer?.creditBalance ?? 0;

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
            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex items-center gap-2 text-sm text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand font-display text-xs font-semibold uppercase text-terracotta-deep">
                  {displayName.charAt(0)}
                </span>
                <span className="max-w-[9rem] truncate">{displayName}</span>
              </span>
              <span
                title={`${creditBalance} credits`}
                className="rounded-full border border-ochre/30 bg-ochre/10 px-2.5 py-1 text-xs font-semibold text-ochre"
              >
                {creditBalance} {creditBalance === 1 ? "credit" : "credits"}
              </span>
              <LogoutButton />
            </div>
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
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand font-display text-xs font-semibold uppercase text-terracotta-deep">
                      {displayName.charAt(0)}
                    </span>
                    <span className="truncate text-sm text-ink">
                      {displayName}
                    </span>
                  </div>
                  <span className="mt-2.5 inline-flex rounded-full border border-ochre/30 bg-ochre/10 px-2.5 py-1 text-xs font-semibold text-ochre">
                    {creditBalance} {creditBalance === 1 ? "credit" : "credits"}
                  </span>
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
