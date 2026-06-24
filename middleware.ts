import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE, computeAdminToken } from "@/lib/admin-auth";

/** Protect every /admin route (except the login page) with the session cookie. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const expected = await computeAdminToken();
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;

  // If ADMIN_PASSWORD isn't configured, expected is null and nothing matches —
  // the admin stays locked.
  if (!expected || cookie !== expected) {
    const url = new URL("/admin/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
