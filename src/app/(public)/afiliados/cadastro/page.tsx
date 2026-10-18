import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { AffiliateRegisterForm } from "./affiliate-register-form";
import {
  COMMISSION_HOLD_DAYS,
  DEFAULT_COMMISSION_BP,
  DEFAULT_COMMISSION_MONTHS,
} from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Cadastro de afiliado",
  description:
    "Crie seu cadastro de afiliado, receba seu link na hora e ganhe comissão recorrente sobre cada assinatura paga.",
};

export default function AffiliateRegisterPage() {
  const rate = DEFAULT_COMMISSION_BP / 100;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1fr_420px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Programa de afiliados
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900">
          Cadastre-se e receba seu link agora
        </h1>
        <p className="mt-3 max-w-lg text-base text-ink-600">
          O cadastro é imediato. Assim que enviar, você já entra na sua área com
          o link pronto para divulgar — sem análise e sem espera.
        </p>

        <ul className="mt-6 space-y-3 text-sm text-ink-700">
          {[
            `${rate}% de comissão sobre cada fatura paga por até ${DEFAULT_COMMISSION_MONTHS} meses`,
            "Comissão recorrente: a loja indicada paga, você recebe todo mês",
            `Repasse por Pix após ${COMMISSION_HOLD_DAYS} dias de segurança`,
            "Extrato com loja, fatura e valor, disponível na sua área",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 px-5 py-4 text-sm leading-relaxed text-ink-600">
          <p className="font-semibold text-ink-900">Como a indicação é contada</p>
          <p className="mt-1">
            Seu link é <code className="rounded bg-white px-1">/cadastro?ref=seu-codigo</code>.
            Quem se cadastrar por ele fica vinculado à sua conta, e a comissão
            passa a valer quando a loja paga a primeira fatura. Ler as{" "}
            <Link href="/afiliados" className="font-medium text-brand-700 underline">
              regras completas
            </Link>
            .
          </p>
        </div>
      </div>

      <AffiliateRegisterForm />
    </div>
  );
}
