import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { findPendingAuthToken } from "@/lib/auth-tokens";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Definir senha" };

export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pending = await findPendingAuthToken(token);

  if (!pending) {
    return (
      <Card className="card-pad">
        <h1 className="text-xl font-bold text-ink-900">Link inválido ou expirado</h1>
        <p className="mt-1 text-sm text-ink-500">
          Este link já foi usado ou passou do prazo. Solicite um novo para
          continuar.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/esqueci-senha" className="btn btn-primary w-full">
            Solicitar novo link
          </Link>
          <Link href="/login" className="btn btn-secondary w-full">
            Voltar para o login
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <PasswordForm
      token={token}
      name={pending.name}
      email={pending.email}
      mode={pending.type === "RESET_PASSWORD" ? "reset" : "create"}
    />
  );
}
