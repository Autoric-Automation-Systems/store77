import type { ReactNode } from "react";
import { COMPANY } from "@/lib/legal";

export function LegalPage({
  title,
  summary,
  updatedAt,
  children,
}: {
  title: string;
  summary: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        Documento legal
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-base text-ink-600">{summary}</p>
      <p className="mt-2 text-sm text-ink-400">Última atualização: {updatedAt}</p>

      <div className="mt-10 space-y-8">{children}</div>
    </article>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-bold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function ContactBlock() {
  return (
    <dl className="mt-3 grid gap-2 text-sm text-ink-600">
      <div className="flex gap-2">
        <dt className="w-40 shrink-0 font-medium text-ink-700">Razão social</dt>
        <dd>{COMPANY.legalName}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-40 shrink-0 font-medium text-ink-700">CNPJ</dt>
        <dd>{COMPANY.cnpj}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-40 shrink-0 font-medium text-ink-700">Endereço</dt>
        <dd>{COMPANY.address}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-40 shrink-0 font-medium text-ink-700">Contato</dt>
        <dd>{COMPANY.contactEmail}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-40 shrink-0 font-medium text-ink-700">
          Encarregado de dados
        </dt>
        <dd>{COMPANY.privacyEmail}</dd>
      </div>
    </dl>
  );
}
