import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/login"];
const apiPaths = ["/api"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (apiPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const localeMatch = pathname.match(/^\/(ar|en)(\/|$)/);
  const locale = localeMatch?.[1] || "ar";
  const pathWithoutLocale = localeMatch
    ? pathname.replace(/^\/(ar|en)/, "") || "/"
    : pathname;

  if (publicPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    return intlMiddleware(request);
  }

  const session = request.cookies.get("attendance_session");
  if (!session && !pathWithoutLocale.startsWith("/login")) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathWithoutLocale.startsWith("/login")) {
    const dashUrl = new URL(`/${locale}`, request.url);
    return NextResponse.redirect(dashUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
