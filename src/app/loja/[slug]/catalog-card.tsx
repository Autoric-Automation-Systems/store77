"use client";

import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatBRL } from "@/lib/format";
import { installmentLabel, installmentPlan } from "@/lib/installments";
import { ProductGallery } from "./product-gallery";

export type StorefrontProduct = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  creditPriceCents: number | null;
  installments: number;
  quantity: number;
  unit: string;
  minQuantity: number;
  images: string[];
  /** Página completa do produto. */
  href: string;
  whatsappHref: string | null;
};

const QUICK_VIEW_PARAM = "produto";

function urlWithoutQuickView(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(QUICK_VIEW_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Card da vitrine.
 *
 * A URL guarda qual produto está aberto (`?produto=<id>`): assim o botão
 * "voltar" do navegador fecha a janela em vez de sair da loja, e o link pode
 * ser compartilhado.
 */
export function CatalogCard({
  product,
  primaryColor,
  accentColor,
}: {
  product: StorefrontProduct;
  primaryColor: string;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const available = product.quantity > 0;
  const plan = installmentPlan(
    product.priceCents,
    product.creditPriceCents,
    product.installments,
  );
  const planLabel = installmentLabel(plan);

  useEffect(() => setMounted(true), []);

  // Deep link e botão "voltar": a URL é a fonte da verdade da janela.
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(window.location.search).get(
        QUICK_VIEW_PARAM,
      );
      setOpen(id === product.id);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [product.id]);

  const openQuickView = useCallback(() => {
    if (open) return;
    const url = new URL(window.location.href);
    url.searchParams.set(QUICK_VIEW_PARAM, product.id);
    window.history.pushState({ store77QuickView: product.id }, "", url);
    setOpen(true);
  }, [open, product.id]);

  const close = useCallback(() => {
    if (window.history.state?.store77QuickView === product.id) {
      window.history.back();
      return;
    }
    window.history.replaceState({}, "", urlWithoutQuickView());
    setOpen(false);
  }, [product.id]);

  // Ao abrir a página completa, sai do estado da janela para o "voltar" levar
  // à vitrine, e não reabrir a janela.
  const leaveForFullPage = useCallback(() => {
    window.history.replaceState({}, "", urlWithoutQuickView());
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition hover:shadow-md">
        <div className="relative">
          <ProductGallery
            images={product.images}
            alt={product.name}
            onOpen={openQuickView}
          />

          <span
            className="pointer-events-none absolute left-2 top-2 z-20 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ backgroundColor: available ? primaryColor : "#64748b" }}
          >
            {available ? "Disponível" : "Indisponível"}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          <button type="button" onClick={openQuickView} className="text-left">
            <h3 className="line-clamp-2 text-sm font-semibold text-ink-900">
              {product.name}
            </h3>
          </button>
          <p className="text-xs text-ink-400">
            {product.code}
            {available ? ` · ${product.quantity} ${product.unit}` : ""}
          </p>

          <p className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pt-1">
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: primaryColor }}
            >
              {formatBRL(product.priceCents)}
            </span>
            <span className="text-[11px] font-medium text-ink-500">à vista</span>
          </p>
          {planLabel ? (
            <p className="text-xs font-semibold text-ink-600">{planLabel}</p>
          ) : null}

          {product.whatsappHref ? (
            <a
              href={product.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <MessageCircle className="size-3.5" />
              Pedir no WhatsApp
            </a>
          ) : null}
        </div>
      </article>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
              onClick={close}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`quick-view-${product.id}`}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Visualização rápida
                  </p>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Fechar"
                    className="-mr-1 rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
                  <ProductGallery
                    images={product.images}
                    alt={product.name}
                    variant="detail"
                  />

                  <div className="flex flex-col gap-3">
                    <div>
                      <h2
                        id={`quick-view-${product.id}`}
                        className="text-xl font-bold leading-snug text-ink-900"
                      >
                        {product.name}
                      </h2>
                      <p className="mt-1 text-xs text-ink-500">
                        Código {product.code}
                      </p>
                    </div>

                    <div>
                      <p
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: primaryColor }}
                      >
                        {formatBRL(product.priceCents)}
                      </p>
                      <p className="text-xs font-medium text-ink-500">
                        à vista
                        {planLabel ? ` · ${planLabel}` : ""}
                      </p>
                      {!plan?.interestFree && plan ? (
                        <p className="mt-1 text-xs text-ink-500">
                          Total no crédito: {formatBRL(plan.totalCents)}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-sm text-ink-600">
                      {available ? (
                        <>
                          <span className="font-semibold text-emerald-700">
                            Em estoque
                          </span>{" "}
                          · {product.quantity} {product.unit}
                          {product.minQuantity > 1
                            ? ` · mínimo ${product.minQuantity} ${product.unit}`
                            : ""}
                        </>
                      ) : (
                        <span className="font-semibold text-ink-500">
                          Sem estoque no momento
                        </span>
                      )}
                    </p>

                    {product.description ? (
                      <p className="max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink-600">
                        {product.description}
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-col gap-2 pt-2">
                      {product.whatsappHref ? (
                        <a
                          href={product.whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                          style={{ backgroundColor: accentColor }}
                        >
                          <MessageCircle className="size-4" />
                          Pedir no WhatsApp
                        </a>
                      ) : null}
                      <Link
                        href={product.href}
                        onClick={leaveForFullPage}
                        className="inline-flex items-center justify-center rounded-xl border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:bg-ink-50"
                      >
                        Ver página completa do produto
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
