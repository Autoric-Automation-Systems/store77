import { NextResponse, type NextRequest } from "next/server";
import {
  AFFILIATE_COOKIE,
  verifyAffiliateToken,
} from "@/lib/affiliate-session";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/estoque",
  "/caixa",
  "/financeiro",
  "/vitrine",
  "/usuarios",
  "/clientes",
  "/assinatura",
  "/admin",
];

const AUTH_PAGES = ["/login", "/cadastro"];

const AFFILIATE_AREA = "/afiliados/painel";
const AFFILIATE_LOGIN = "/afiliados/entrar";

/** Código de indicação aceito: minúsculas, números e hífen. */
const REF_CODE = /^[a-z0-9][a-z0-9-]{2,63}$/;
const REF_COOKIE = "store77_ref";
const REF_MAX_AGE = 60 * 60 * 24 * 90;

/** Rotas fixas de /afiliados que não são código de indicação. */
const AFFILIATE_RESERVED = new Set(["cadastro", "entrar", "painel"]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const affiliateId = await verifyAffiliateToken(
    request.cookies.get(AFFILIATE_COOKIE)?.value,
  );
  const inAffiliateArea =
    pathname === AFFILIATE_AREA || pathname.startsWith(`${AFFILIATE_AREA}/`);

  if (inAffiliateArea && !affiliateId) {
    const url = request.nextUrl.clone();
    url.pathname = AFFILIATE_LOGIN;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (affiliateId && pathname === AFFILIATE_LOGIN) {
    const url = request.nextUrl.clone();
    url.pathname = AFFILIATE_AREA;
    url.search = "";
    return NextResponse.redirect(url);
  }

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

  const response = NextResponse.next();

  // Guarda o código por 90 dias: quem clica no link, navega pelos preços e só
  // se cadastra depois continua atribuído ao afiliado. Duas portas de entrada:
  // a landing /afiliados/<codigo> e o cadastro com ?ref=<codigo>.
  const fromPath =
    pathname.startsWith("/afiliados/") &&
    !AFFILIATE_RESERVED.has(pathname.slice("/afiliados/".length))
      ? pathname.slice("/afiliados/".length)
      : "";
  const ref = (
    request.nextUrl.searchParams.get("ref")?.trim() ||
    fromPath
  ).toLowerCase();

  if (REF_CODE.test(ref)) {
    response.cookies.set(REF_COOKIE, ref, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REF_MAX_AGE,
    });
  }

  return response;
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
    "/assinatura/:path*",
    "/admin/:path*",
    "/login",
    "/cadastro",
    "/afiliados/painel/:path*",
    "/afiliados/entrar",
    "/afiliados/:code",
  ],
};
