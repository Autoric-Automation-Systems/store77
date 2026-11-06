import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { COMPANY, PRODUCT } from "@/lib/legal";
import { whatsappLink } from "./links";

export type StoreChrome = {
  name: string;
  slug: string;
  logoUrl: string | null;
  whatsapp: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

/** Cabeçalho fixo da vitrine: identidade da loja e contato. */
export function StoreHeader({ store }: { store: StoreChrome }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-black/5 backdrop-blur"
      style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href={`/loja/${store.slug}`}
          className="flex items-center gap-3"
        >
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={store.name}
              className="size-10 rounded-xl object-contain"
            />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: store.primaryColor }}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="font-bold tracking-tight text-ink-900">
            {store.name}
          </span>
        </Link>

        {store.whatsapp ? (
          <a
            href={whatsappLink(store.whatsapp, store.name)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: store.primaryColor }}
          >
            <MessageCircle className="size-4" />
            Falar com a loja
          </a>
        ) : null}
      </div>
    </header>
  );
}

/** Rodapé da vitrine, com os créditos em faixa clara. */
export function StoreFooter({ store }: { store: StoreChrome }) {
  return (
    <footer className="mt-6">
      <div style={{ backgroundColor: store.secondaryColor }} className="text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-3">
          <div>
            <p className="font-bold">{store.name}</p>
            {store.address ? (
              <p className="mt-2 flex items-start gap-2 text-sm text-white/70">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {store.address}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 text-sm text-white/70">
            {store.phone ? (
              <p className="flex items-center gap-2">
                <Phone className="size-4" />
                {store.phone}
              </p>
            ) : null}
            {store.email ? (
              <p className="flex items-center gap-2">
                <MessageCircle className="size-4" />
                {store.email}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-white/50 sm:text-right">
            Catálogo atualizado automaticamente pelo estoque da loja.
          </p>
        </div>
      </div>

      {/*
        Créditos em faixa clara: o logotipo do Store77 é escuro e o da AUTORIC
        é azul, então nenhum dos dois tem contraste sobre o rodapé colorido
        da loja.
      */}
      <div className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-4 text-xs text-ink-500 sm:flex-row">
          <Link
            href={PRODUCT.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-ink-800"
          >
            <Image
              src="/logoname.png"
              alt="Store77"
              width={669}
              height={373}
              className="h-4 w-auto"
            />
            <span>Loja criada com Store77</span>
          </Link>

          <Link
            href={COMPANY.site}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-ink-800"
          >
            <span>Desenvolvido por</span>
            <Image
              src="/logoDev.png"
              alt="AUTORIC — Automação e Sistemas"
              width={1160}
              height={323}
              className="h-4 w-auto"
            />
          </Link>
        </div>
      </div>
    </footer>
  );
}
