import type { AuthTokenType } from "@/db/schema";
import { escapeHtml, sendEmail } from "./mail";
import { appUrl } from "./url";

export async function sendPasswordEmail({
  to,
  name,
  storeName,
  token,
  type,
  invite = false,
}: {
  to: string;
  name: string;
  storeName: string;
  token: string;
  type: AuthTokenType;
  invite?: boolean;
}): Promise<boolean> {
  const isReset = type === "RESET_PASSWORD";
  const url = appUrl(`/definir-senha/${token}`);
  const expiry = isReset ? "1 hora" : "48 horas";
  const subject = isReset
    ? "Redefina sua senha no Store77"
    : invite
      ? `Você foi convidado para a equipe de ${storeName}`
      : "Crie a senha da sua loja no Store77";
  const title = isReset ? "Redefina sua senha" : "Crie sua senha";
  const button = isReset ? "Redefinir senha" : "Criar senha";
  const intro = isReset
    ? "Recebemos um pedido para redefinir a senha da sua conta."
    : invite
      ? `Você recebeu acesso à loja ${storeName} no Store77. Crie sua senha para começar.`
      : `A loja ${storeName} foi criada no Store77. Falta só criar sua senha para entrar.`;

  const text = [
    `Olá, ${name}!`,
    "",
    intro,
    "",
    `${button}: ${url}`,
    "",
    `O link expira em ${expiry} e só pode ser usado uma vez.`,
    "Se você não reconhece este e-mail, ignore esta mensagem.",
  ].join("\n");

  const html = `
    <div style="background:#f1f5f9;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#334155">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
        <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#4f46e5">Store77</p>
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a">${escapeHtml(title)}</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6">Olá, ${escapeHtml(name)}.</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6">${escapeHtml(intro)}</p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${escapeHtml(button)}</a>
        <p style="margin:24px 0 4px;font-size:13px;line-height:1.6;color:#64748b">Ou copie e cole este link no navegador:</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#4f46e5;word-break:break-all">${escapeHtml(url)}</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">O link expira em ${expiry} e só pode ser usado uma vez.</p>
      </div>
      <p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center">Se você não reconhece este e-mail, ignore esta mensagem.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}
