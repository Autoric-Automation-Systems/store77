"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

/** Upload de uma única imagem (logo, capa do hero) com input oculto. */
export function SingleImageUploader({
  name,
  initialUrl,
  label = "Enviar imagem",
}: {
  name: string;
  initialUrl?: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Falha ao enviar a imagem.");
      } else {
        setUrl(payload.url);
      }
    } catch {
      setError("Falha de rede ao enviar a imagem.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url ?? ""} />

      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Pré-visualização"
            className="size-20 rounded-xl border border-ink-200 bg-white object-contain"
          />
        ) : null}

        <label className="btn btn-secondary cursor-pointer">
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {uploading ? "Enviando..." : label}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>

        {url ? (
          <button
            type="button"
            className="btn btn-ghost px-3 py-2 text-red-600 hover:bg-red-50"
            onClick={() => setUrl(null)}
          >
            <Trash2 className="size-4" />
            Remover
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-ink-500">
        PNG, JPG, WEBP, AVIF ou GIF, até 5 MB.
      </p>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
