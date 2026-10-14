import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadImage } from "@/lib/blob";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato inválido. Use JPG, PNG, WEBP, AVIF ou GIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem maior que 5 MB." }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type] ?? "bin";
  const key = `lojas/${user.storeId}/produtos/${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await uploadImage(
      key,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    return NextResponse.json({ url });
  }

  // Sem token do Vercel Blob (desenvolvimento local): grava em public/uploads.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN não configurado neste ambiente." },
      { status: 500 },
    );
  }

  const localKey = key.replace("lojas/", "").replace(/\//g, "-");
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, localKey),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({ url: `/uploads/${localKey}` });
}
