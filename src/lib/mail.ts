import nodemailer, { type Transporter } from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

const DEFAULT_FROM = "Store77 <nao-responda@store77.app>";

/** Aceita "Nome <email>" ou apenas o endereço. */
function addressOf(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  const address = (match ? match[1] : value).trim();
  return address.includes("@") ? address : null;
}

function smtpConfig(): SmtpConfig | null {
  // O Google exibe a senha de app em grupos ("abcd efgh ..."); espaços não
  // fazem parte da credencial.
  const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");
  if (!pass) return null;

  // No Gmail o usuário SMTP é o endereço completo da conta que gerou a senha
  // de app. EMAIL_USER permite separar remetente e conta autenticada.
  const user =
    addressOf(process.env.EMAIL_USER) ?? addressOf(process.env.EMAIL_FROM);
  if (!user) return null;

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  return { host, port, secure, user, pass };
}

/** Remetente dos e-mails: EMAIL_FROM ou a conta autenticada no SMTP. */
export function mailFrom(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  const user = smtpConfig()?.user;
  return user ? `Store77 <${user}>` : DEFAULT_FROM;
}

/**
 * O envio usa o primeiro transporte configurado:
 * 1. SMTP (Gmail com EMAIL_PASS);
 * 2. Resend (`RESEND_API_KEY`);
 * 3. Em desenvolvimento, imprime o e-mail no terminal.
 */
export function canSendEmail(): boolean {
  return (
    Boolean(smtpConfig() || process.env.RESEND_API_KEY) ||
    process.env.NODE_ENV !== "production"
  );
}

let cachedTransporter: { key: string; transporter: Transporter } | null = null;

function transporterFor(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user}`;
  if (cachedTransporter?.key === key) return cachedTransporter.transporter;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  cachedTransporter = { key, transporter };
  return transporter;
}

async function sendViaSmtp(
  input: MailInput,
  config: SmtpConfig,
): Promise<boolean> {
  try {
    await transporterFor(config).sendMail({
      from: mailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (error) {
    console.error("Falha ao enviar e-mail por SMTP:", error);
    return false;
  }
}

async function sendViaResend(input: MailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(
        `Falha ao enviar e-mail (${response.status}):`,
        await response.text().catch(() => ""),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Falha ao enviar e-mail:", error);
    return false;
  }
}

export async function sendEmail(input: MailInput): Promise<boolean> {
  const smtp = smtpConfig();
  if (smtp) {
    if (await sendViaSmtp(input, smtp)) return true;
    // Sem Resend como reserva, um SMTP fora do ar derrubaria o cadastro.
    if (!process.env.RESEND_API_KEY) return false;
  }

  if (process.env.RESEND_API_KEY) return sendViaResend(input);

  if (process.env.NODE_ENV === "production") {
    console.error(
      "Envio de e-mails não configurado: defina EMAIL_PASS ou RESEND_API_KEY.",
    );
    return false;
  }

  console.info(
    `\n[email:dev] Para: ${input.to}\nAssunto: ${input.subject}\n${input.text}\n`,
  );
  return true;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
