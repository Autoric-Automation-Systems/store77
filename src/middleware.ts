import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/estoque",
  "/caixa",
  "/financeiro",
  "/vitrine",
  "/usuarios",
  "/clientes",
];

const AUTH_PAGES = ["/login", "/cadastro"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userId = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (userId && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/estoque/:path*",
    "/caixa/:path*",
    "/financeiro/:path*",
    "/vitrine/:path*",
    "/usuarios/:path*",
    "/clientes/:path*",
    "/login",
    "/cadastro",
  ],
};
