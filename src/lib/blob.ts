import { put, get, BlobError, type GetBlobResult } from "@vercel/blob";

/**
 * Upload de imagens para o Vercel Blob.
 *
 * Um Blob store nasce com um modo de acesso fixo — `public` (qualquer pessoa
 * com a URL lê) ou `private` (toda leitura exige o token). O modo é definido na
 * criação da store e não é ajustável pelo código, então detectamos qual está em
 * uso na primeira tentativa e guardamos o resultado.
 *
 * - Store pública: devolvemos a URL do Blob, servida direto pelo CDN.
 * - Store privada: devolvemos um caminho da nossa rota `/api/blob/...`, que
 *   lê o arquivo autenticado e cacheia na borda.
 *
 * O caminho devolvido é o que fica salvo no banco, então a troca de modo não
 * quebra imagens já cadastradas: as antigas continuam apontando para onde
 * funcionavam.
 */

type BlobAccessMode = "public" | "private";

const PREFIX = "lojas/";

/** Mesmo caminho de URL da nossa rota proxy, usado no modo privado. */
export const APP_BLOB_PREFIX = "/api/blob/";

let detectedMode: BlobAccessMode | null = null;

function isPrivateStoreError(error: unknown): boolean {
  if (!(error instanceof BlobError)) return false;
  return /private store|public access/i.test(error.message);
}

export type UploadResult = { url: string; mode: BlobAccessMode };

export async function uploadImage(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  // Já sabemos que a store é privada: não perde uma requisição tentando public.
  if (detectedMode !== "private") {
    try {
      const blob = await put(pathname, body, {
        access: "public",
        contentType,
        addRandomSuffix: false,
      });
      detectedMode = "public";
      return { url: blob.url, mode: "public" };
    } catch (error) {
      if (!isPrivateStoreError(error)) throw error;
      detectedMode = "private";
    }
  }

  await put(pathname, body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });

  return { url: `${APP_BLOB_PREFIX}${pathname}`, mode: "private" };
}

/** Caminho relativo à store a partir de uma URL nossa de proxy. */export function pathnameFromProxyUrl(url: string): string | null {
  if (!url.startsWith(APP_BLOB_PREFIX)) return null;

  const pathname = decodeURIComponent(url.slice(APP_BLOB_PREFIX.length));

  // Defesa contra escaparem do prefixo esperado (ex.: `../`).
  if (!pathname.startsWith(PREFIX)) return null;
  if (pathname.includes("..") || pathname.includes("//")) return null;

  return pathname;
}

/**
 * Metadados sociais (og:image) exigem URL absoluta. Quando a store é privada a
 * imagem é servida por `/api/blob/...`, que é relativa — aqui resolvemos contra
 * o host da requisição.
 */
export function toAbsoluteUrl(
  url: string,
  host: string | null | undefined,
): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (!host) return url;
  const protocol = /^(localhost|127\.|0\.0\.0\.0)/.test(host) ? "http" : "https";
  return `${protocol}://${host}${url}`;
}

let readMode: BlobAccessMode | null = null;

/**
 * Lê uma imagem da store, seja ela pública ou privada.
 *
 * Tenta primeiro o modo que já funcionou antes (ou `private`, que é o caso mais
 * restrito). Isso permite armazenar o mesmo caminho `/api/blob/...` no banco
 * mesmo que a store mude de modo depois: a leitura se ajusta sozinha, em vez de
 * deixar imagens antigas quebradas.
 */
export async function readImage(pathname: string): Promise<GetBlobResult | null> {
  const order: BlobAccessMode[] =
    readMode === "public" ? ["public", "private"] : ["private", "public"];

  let lastError: unknown;

  for (const access of order) {
    try {
      const result = await get(pathname, { access });
      if (!result) return null;
      readMode = access;
      return result;
    } catch (error) {
      if (!(error instanceof BlobError)) throw error;
      lastError = error;
    }
  }

  throw lastError;
}
