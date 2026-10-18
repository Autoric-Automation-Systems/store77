import { cookies } from "next/headers";
import { AFFILIATE_COOKIE, AFFILIATE_MAX_AGE_SECONDS } from "./affiliate-session";

/**
 * Leitura e escrita do cookie do afiliado.
 *
 * Separado de `affiliate-session.ts` porque o middleware importa o módulo de
 * tokens e roda no Edge, onde `next/headers` não existe.
 */
export async function affiliateCookieToken(): Promise<string | undefined> {
  return (await cookies()).get(AFFILIATE_COOKIE)?.value;
}

export async function setAffiliateCookie(token: string): Promise<void> {
  (await cookies()).set(AFFILIATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AFFILIATE_MAX_AGE_SECONDS,
  });
}

export async function clearAffiliateCookie(): Promise<void> {
  (await cookies()).delete(AFFILIATE_COOKIE);
}
