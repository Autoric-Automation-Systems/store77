// Mesmos imports granulares de `session-token.ts`: este módulo também é lido
// pelo middleware, que roda no Edge Runtime.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

/**
 * Sessão do afiliado.
 *
 * Afiliado não é usuário de loja (`users.storeId` é obrigatório), então tem
 * cookie e token próprios. O claim `typ` impede a troca de tokens entre as duas
 * áreas: um token de afiliado no cookie da loja é recusado, e vice-versa.
 */
export const AFFILIATE_COOKIE = "store77_affiliate";
export const AFFILIATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function getSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET ausente ou curta.");
  }
  return encoder.encode(value);
}

export async function signAffiliateToken(affiliateId: string): Promise<string> {
  return new SignJWT({ sub: affiliateId, typ: "affiliate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AFFILIATE_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAffiliateToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.typ !== "affiliate") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
