import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PATHS = ["/admin"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    const token = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/api/auth/signin";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
