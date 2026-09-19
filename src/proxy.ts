import { NextRequest, NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/session";

// Single-operator site — everything requires a session except the login page itself.
const PUBLIC_PATHS = ["/login"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await isValidSession(cookie);

  if (!isPublic && !authenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPublic && authenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Runs on everything except static assets and Next's own internals.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
