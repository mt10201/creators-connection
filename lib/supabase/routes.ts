/**
 * Routes that require an authenticated user. Anything not listed here is public,
 * including `/explore`.
 */
export const protectedRoutes = [
  "/upload",
  "/edit",
  "/saved",
  "/dashboard",
  "/settings",
];

/** Routes an authenticated user should be bounced away from. */
export const authRoutes = ["/login", "/signup"];

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
