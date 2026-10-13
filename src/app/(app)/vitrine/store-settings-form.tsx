"use client";

import { useActionState, useState } from "react";
import { ExternalLink } from "lucide-react";
import { saveStoreSettingsAction } from "@/app/actions/store";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader, Field } from "@/components/ui";
import type { ActionState } from "@/lib/validation";
import { SingleImageUploader } from "./single-image-uploader";

const initialState: ActionState = { ok: false };

export type StoreSettings = {
  name: string;
  slug: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  aboutText: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  isPublic: boolean;
  showOutOfStock: boolean;
};

function ColorField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          name={name}
          defaultValue={defaultValue}
          className="h-10 w-14 cursor-pointer rounded-lg border border-ink-300 bg-white p-1"
        />
        <span className="font-mono text-xs text-ink-500">{defaultValue}</span>
      </div>
    </div>
  );
}

export function StoreSettingsForm({
  store,
  publicPath,
}: {
  store: StoreSettings;
  publicPath: string;
}) {
  const [state, formAction] = useActionState(saveStoreSettingsAction, initialState);
  const [slug, setSlug] = useState(store.slug);

  const previewPath = publicPath.replace(/\/[^/]*$/, `/${slug || store.slug}`);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Link público"
          description="É o endereço que seus clientes vão acessar."
          action={
            <a
              href={previewPath}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary px-3 py-2 text-xs"
            >
              <ExternalLink className="size-3.5" />
              Abrir vitrine
            </a>
          }
        />
        <div className="card-pad grid gap-5 sm:grid-cols-2">
          <Field label="Nome da loja" name="name" error={state.fieldErrors?.name}>
            <input
              id="name"
              name="name"
              required
              className="input"
              defaultValue={store.name}
            />
          </Field>

          <Field
            label="Link"
            name="slug"
            error={state.fieldErrors?.slug}
            hint={`Ficará assim: ${previewPath}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-400">/loja/</span>
              <input
                id="slug"
                name="slug"
                required
                className="input"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </div>
          </Field>

          <label className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={store.isPublic}
              className="size-4 rounded border-ink-300"
            />
            <span className="text-sm text-ink-700">
              Deixar a vitrine publicada e acessível para qualquer visitante
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              name="showOutOfStock"
              defaultChecked={store.showOutOfStock}
              className="size-4 rounded border-ink-300"
            />
            <span className="text-sm text-ink-700">
              Mostrar produtos sem estoque (marcados como indisponíveis)
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Identidade visual"
          description="Logo, textos e paleta que a vitrine usa automaticamente."
        />
        <div className="card-pad grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="label">Logo</span>
            <SingleImageUploader
              name="logoUrl"
              initialUrl={store.logoUrl}
              label="Enviar logo"
            />
          </div>

          <Field
            label="Frase principal (hero)"
            name="heroTitle"
            error={state.fieldErrors?.heroTitle}
          >
            <input
              id="heroTitle"
              name="heroTitle"
              className="input"
              defaultValue={store.heroTitle ?? store.name}
              placeholder="A moda que combina com você"
            />
          </Field>

          <Field
            label="Texto de apoio"
            name="heroSubtitle"
            error={state.fieldErrors?.heroSubtitle}
          >
            <input
              id="heroSubtitle"
              name="heroSubtitle"
              className="input"
              defaultValue={store.heroSubtitle ?? ""}
              placeholder="Novidades toda semana, entrega no mesmo dia"
            />
          </Field>

          <div className="sm:col-span-2">
            <span className="label">Imagem do hero</span>
            <SingleImageUploader
              name="heroImageUrl"
              initialUrl={store.heroImageUrl}
              label="Enviar imagem de capa"
            />
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Texto complementar"
              name="aboutText"
              error={state.fieldErrors?.aboutText}
              hint="Aparece na seção “Sobre a loja”."
            >
              <textarea
                id="aboutText"
                name="aboutText"
                rows={5}
                className="input"
                defaultValue={store.aboutText ?? ""}
              />
            </Field>
          </div>

          <ColorField
            label="Cor principal"
            name="primaryColor"
            defaultValue={store.primaryColor}
          />
          <ColorField
            label="Cor secundária"
            name="secondaryColor"
            defaultValue={store.secondaryColor}
          />
          <ColorField
            label="Cor de destaque"
            name="accentColor"
            defaultValue={store.accentColor}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Contato" description="Usado nos botões de pedido da vitrine." />
        <div className="card-pad grid gap-5 sm:grid-cols-2">
          <Field
            label="WhatsApp"
            name="whatsapp"
            error={state.fieldErrors?.whatsapp}
            hint="Somente números com DDI. Ex.: 5511999999999"
          >
            <input
              id="whatsapp"
              name="whatsapp"
              className="input"
              defaultValue={store.whatsapp ?? ""}
              placeholder="5511999999999"
            />
          </Field>

          <Field label="Telefone" name="phone" error={state.fieldErrors?.phone}>
            <input
              id="phone"
              name="phone"
              className="input"
              defaultValue={store.phone ?? ""}
            />
          </Field>

          <Field label="E-mail" name="email" error={state.fieldErrors?.email}>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              defaultValue={store.email ?? ""}
            />
          </Field>

          <Field label="Endereço" name="address" error={state.fieldErrors?.address}>
            <input
              id="address"
              name="address"
              className="input"
              defaultValue={store.address ?? ""}
            />
          </Field>
        </div>
      </Card>

      <div className="flex gap-3">
        <SubmitButton>Salvar vitrine</SubmitButton>
      </div>
    </form>
  );
}
