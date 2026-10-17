import type { Metadata } from "next";
import { ResendConfirmationForm } from "./resend-form";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function ConfirmSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; falha?: string }>;
}) {
  const { email = "", falha } = await searchParams;

  return (
    <ResendConfirmationForm
      initialEmail={email}
      mailFailed={falha === "1"}
    />
  );
}
