import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { paymentEvents } from "@/db/schema";
import { asaas } from "@/lib/billing/asaas";
import { applyProviderEvent } from "@/lib/billing/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Asaas.
 *
 * Três garantias:
 * 1. token confere (o Asaas manda `asaas-access-token`);
 * 2. o evento é gravado antes de ser processado, com chave única por
 *    (provider, externalId) — reenvio do gateway não aplica comissão duas vezes;
 * 3. falha de processamento responde 500, para o gateway tentar de novo. O
 *    evento fica com `error` preenchido e é reprocessado na próxima tentativa.
 */
export async function POST(request: Request) {
  const provider = asaas();

  if (!provider.isConfigured) {
    return NextResponse.json(
      { error: "Cobrança não configurada neste ambiente." },
      { status: 503 },
    );
  }

  if (!provider.verifyWebhookToken(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const events = provider.parseWebhook(body);

  for (const event of events) {
    const [existing] = await db()
      .select({
        id: paymentEvents.id,
        processedAt: paymentEvents.processedAt,
      })
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.provider, "ASAAS"),
          eq(paymentEvents.externalId, event.externalId),
        ),
      )
      .limit(1);

    if (existing?.processedAt) continue;

    let eventId = existing?.id;
    if (!eventId) {
      const [inserted] = await db()
        .insert(paymentEvents)
        .values({
          provider: "ASAAS",
          externalId: event.externalId,
          eventType: event.kind,
          payload: body as Record<string, unknown>,
        })
        .onConflictDoNothing()
        .returning({ id: paymentEvents.id });

      // Outra entrega do mesmo evento chegou ao mesmo tempo: ela processa.
      if (!inserted) continue;
      eventId = inserted.id;
    }

    try {
      await applyProviderEvent(event);
      await db()
        .update(paymentEvents)
        .set({ processedAt: new Date(), error: null })
        .where(eq(paymentEvents.id, eventId));
    } catch (error) {
      await db()
        .update(paymentEvents)
        .set({ error: error instanceof Error ? error.message : String(error) })
        .where(eq(paymentEvents.id, eventId));

      return NextResponse.json(
        { error: "Falha ao processar o evento." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, processed: events.length });
}
