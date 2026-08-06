/**
 * Routes that require an authenticated user. Anything not listed here is public,
 * including `/explore`.
 */
export const protectedRoutes = [
  "/upload",
  "/edit",
  "/saved",
  "/dashboard",
  "/notifications",
  "/settings",
];

/**
 * Routes an authenticated user should be bounced away from. `/reset-password`
 * is deliberately absent: a recovery link signs you in before you land there.
 */
export const authRoutes = ["/login", "/signup", "/forgot-password"];

function matches(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isProtectedRoute(pathname: string) {
  return matches(pathname, protectedRoutes);
}

export function isAuthRoute(pathname: string) {
  return matches(pathname, authRoutes);
}
