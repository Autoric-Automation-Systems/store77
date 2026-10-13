// Imports granulares: o middleware roda no Edge Runtime e o bundle raiz do
// `jose` arrasta o suporte a JWE (DecompressionStream), que não existe lá.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "store77_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function getSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET ausente ou curta: defina pelo menos 32 caracteres em .env.local.",
    );
  }
  return encoder.encode(value);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Compatível com o runtime Edge do middleware (Web Crypto apenas). */
export function hasAuthSecret(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
}
