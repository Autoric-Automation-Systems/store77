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
  const rows = [
    { label: "Razão social", value: COMPANY.legalName },
    { label: "CNPJ", value: COMPANY.cnpj },
    { label: "Endereço", value: COMPANY.address },
    { label: "Contato", value: COMPANY.contactEmail },
    { label: "Encarregado de dados", value: COMPANY.privacyEmail },
    { label: "Site", value: COMPANY.site },
  ].filter((row) => Boolean(row.value));

  return (
    <dl className="mt-3 grid gap-2 text-sm text-ink-600">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2">
          <dt className="w-40 shrink-0 font-medium text-ink-700">{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
