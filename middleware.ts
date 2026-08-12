import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes accessible without authentication
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/landing-page" ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico";

  const sessionCookie = request.cookies.get("mbokdhe_session")?.value;
  const isAuthenticated = Boolean(sessionCookie && sessionCookie === "active_admin_session");

  // Redirect authenticated user away from login page to admin dashboard
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated user accessing protected routes to login page
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
