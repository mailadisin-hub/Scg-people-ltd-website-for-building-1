import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes.
  // /api/setup is guarded by its own SETUP_TOKEN check, so it must bypass the
  // session redirect (otherwise the one-time seeding route can never run).
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/setup" ||
    pathname === "/api/admin/import-2026"
  ) {
    if (session && pathname === "/login") {
      const role = (session.user as { role?: string } | undefined)?.role;
      const dest = role === "ADMIN" ? "/admin/dashboard" : "/portal";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // Require authentication
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (session.user as { role?: string } | undefined)?.role;

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // Leaseholder portal — redirect admins away
  if (pathname.startsWith("/portal") && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
