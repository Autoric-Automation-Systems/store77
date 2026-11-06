"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type Variant = "card" | "detail";

/**
 * Galeria da vitrine.
 *
 * As setas trocam a foto no lugar, sem abrir o produto — é o comportamento do
 * Mercado Livre: clicar na imagem abre a visualização, clicar na seta percorre
 * as fotos. Por isso a área que abre o produto é uma camada própria, irmã das
 * setas, e não um botão envolvendo tudo (botão dentro de botão é HTML inválido
 * e quebra a navegação por teclado).
 */
export function ProductGallery({
  images,
  alt,
  variant = "card",
  onOpen,
}: {
  images: string[];
  alt: string;
  variant?: Variant;
  /** Quando presente, a imagem inteira vira área clicável. */
  onOpen?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const count = images.length;
  const isDetail = variant === "detail";
  const current = images[Math.min(index, Math.max(count - 1, 0))];

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((previous) => (previous + delta + count) % count);
    },
    [count],
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`group relative overflow-hidden bg-ink-100 ${
          isDetail ? "aspect-square rounded-2xl" : "aspect-square"
        }`}
        onTouchStart={(event) => {
          // No card o arrasto horizontal é do carrossel da vitrine: só a
          // galeria ampliada aceita swipe para trocar de foto.
          if (!isDetail) return;
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (!isDetail || touchStart.current === null) return;
          const delta =
            (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
          touchStart.current = null;
          if (Math.abs(delta) < 40) return;
          go(delta < 0 ? 1 : -1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(1);
          }
        }}
      >
        {current ? (
          <Image
            key={current}
            src={current}
            alt={alt}
            fill
            sizes={
              isDetail
                ? "(max-width: 640px) 100vw, 460px"
                : "(max-width: 640px) 60vw, 240px"
            }
            className="object-cover"
            unoptimized
            priority={isDetail}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <Package className={isDetail ? "size-16" : "size-10"} />
          </div>
        )}

        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Ver detalhes de ${alt}`}
            className="absolute inset-0 z-0 cursor-pointer"
          />
        ) : null}

        {count > 1 ? (
          <>
            <GalleryArrow
              side="left"
              onClick={() => go(-1)}
              label={`Foto anterior de ${alt}`}
            />
            <GalleryArrow
              side="right"
              onClick={() => go(1)}
              label={`Próxima foto de ${alt}`}
            />
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
              {Math.min(index, count - 1) + 1}/{count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        isDetail ? (
          <div className="flex flex-wrap gap-1.5">
            {images.map((url, position) => (
              <button
                key={url}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Ver foto ${position + 1} de ${alt}`}
                aria-current={position === index}
                className={`size-14 overflow-hidden rounded-lg border-2 transition ${
                  position === index
                    ? "border-ink-900"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={url}
                  alt=""
                  width={56}
                  height={56}
                  className="size-full object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-1">
            {images.map((url, position) => (
              <span
                key={url}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  position === index ? "w-4 bg-ink-700" : "w-1.5 bg-ink-300"
                }`}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={(event) => {
        // A seta só troca a foto; não deve abrir o produto nem o modal.
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-md transition hover:bg-white hover:text-ink-950 ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}
