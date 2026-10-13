"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

/** Envia as fotos e mantém a lista serializada em um input oculto. */
export function ImageUploader({
  name = "images",
  initialUrls = [],
  max = 8,
}: {
  name?: string;
  initialUrls?: string[];
  max?: number;
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const available = max - urls.length;
    const selected = Array.from(files).slice(0, available);
    if (selected.length === 0) {
      setError(`Limite de ${max} fotos atingido.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];

    for (const file of selected) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/upload", { method: "POST", body });
        const payload = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !payload.url) {
          setError(payload.error ?? "Falha ao enviar a imagem.");
          break;
        }
        uploaded.push(payload.url);
      } catch {
        setError("Falha de rede ao enviar a imagem.");
        break;
      }
    }

    if (uploaded.length > 0) setUrls((current) => [...current, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      <div className="flex flex-wrap gap-3">
        {urls.map((url, index) => (
          <div
            key={url}
            className="group relative size-24 overflow-hidden rounded-xl border border-ink-200 bg-ink-50"
          >
            <Image
              src={url}
              alt={`Foto ${index + 1}`}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => setUrls((current) => current.filter((u) => u !== url))}
              className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-red-600 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remover foto ${index + 1}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        {urls.length < max ? (
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-300 bg-white text-ink-500 transition hover:border-brand-500 hover:text-brand-600">
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span className="text-[11px] font-medium">
              {uploading ? "Enviando" : "Adicionar"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-ink-500">
        Até {max} fotos, 5 MB cada. A primeira é a capa usada na vitrine.
      </p>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
