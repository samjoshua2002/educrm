import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";
const ROLE_COOKIE_NAME = "user_role";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME);
  const userRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  // 1. Redirect to login if unauthenticated and trying to access protected routes
  if (
    !token &&
    (pathname.startsWith("/superadmin") || pathname.startsWith("/organization"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Redirect away from login if already authenticated
  if (token && pathname === "/login") {
    if (userRole === "superadmin") {
      return NextResponse.redirect(
        new URL("/superadmin/dashboard", request.url),
      );
    } else {
      return NextResponse.redirect(
        new URL("/organization/dashboard", request.url),
      );
    }
  }

  // 3. Prevent cross-role access (Superadmin vs Org Users)
  // Superadmin trying to access /organization routes (though they can see it in support, usually they have their own prefix)
  if (userRole === "superadmin" && pathname.startsWith("/organization")) {
    return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
  }

  // Org Users (non-superadmins) trying to access /superadmin routes
  if (
    userRole &&
    userRole !== "superadmin" &&
    pathname.startsWith("/superadmin")
  ) {
    return NextResponse.redirect(
      new URL("/organization/dashboard", request.url),
    );
  }

  // 4. Leads vs Lead Manager: org_admin can use both; lead_manager only works the
  // unverified queue (/organization/lead-manager), counselor only works verified
  // leads (/organization/leads) once handed off.
  if (userRole === "lead_manager" && pathname.startsWith("/organization/leads")) {
    return NextResponse.redirect(
      new URL("/organization/lead-manager", request.url),
    );
  }

  if (userRole === "counselor" && pathname.startsWith("/organization/lead-manager")) {
    return NextResponse.redirect(new URL("/organization/leads", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
