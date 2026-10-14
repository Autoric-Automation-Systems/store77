import { NextResponse } from "next/server";
import { readImage } from "@/lib/blob";

export const runtime = "nodejs";

/**
 * Serve imagens de um Blob store privado.
 *
 * Quando a store é privada, toda leitura exige o token, então a URL do Blob não
 * pode ir para o `<img>` do navegador. Esta rota lê o arquivo autenticado e
 * devolve os bytes, deixando a Vercel cachear na borda — o caminho contém um
 * UUID, então o conteúdo daquele caminho nunca muda e o cache pode ser longo.
 *
 * Só serve o que está sob `lojas/`, que é onde a aplicação grava.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse("Blob não configurado.", { status: 500 });
  }

  const { path } = await params;
  const pathname = decodeURIComponent(path.join("/"));

  // Defesa contra escaparem do prefixo esperado.
  if (!pathname.startsWith("lojas/") || pathname.includes("..")) {
    return new NextResponse("Caminho inválido.", { status: 400 });
  }

  try {
    const result = await readImage(pathname);

    if (!result) {
      return new NextResponse("Imagem não encontrada.", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "content-type": result.blob.contentType ?? "application/octet-stream",
        "content-length": String(result.blob.size ?? 0),
        "cache-control": "public, max-age=31536000, immutable",
        etag: result.blob.etag,
      },
    });
  } catch {
    return new NextResponse("Imagem não encontrada.", { status: 404 });
  }
}
