import type { Metadata } from "next";
import { AffiliateLoginForm } from "./affiliate-login-form";

export const metadata: Metadata = { title: "Entrar como afiliado" };

export default async function AffiliateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">
        Área do afiliado
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">
        Acompanhe indicações, comissões e repasses.
      </p>
      <AffiliateLoginForm next={next} />
    </div>
  );
}
