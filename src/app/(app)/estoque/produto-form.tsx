"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProductAction } from "@/app/actions/products";
import { ImageUploader } from "@/components/image-uploader";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader, Field } from "@/components/ui";
import { centsToInput } from "@/lib/format";
import type { ActionState } from "@/lib/validation";

const UNITS = ["UN", "KG", "G", "L", "ML", "M", "CX", "PCT"];

const initialState: ActionState = { ok: false };

export type ProductFormValues = {
  id?: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  barcode: string | null;
  unit: string;
  priceCents: number;
  costCents: number;
  quantity: number;
  minQuantity: number;
  location: string | null;
  active: boolean;
  images: string[];
};

export function ProductForm({
  product,
  categories,
}: {
  product?: ProductFormValues;
  categories: { id: string; name: string; kind: string }[];
}) {
  const [state, formAction] = useActionState(saveProductAction, initialState);
  const isEdit = Boolean(product?.id);

  return (
    <form action={formAction} className="space-y-6">
      {product?.id ? <input type="hidden" name="id" value={product.id} /> : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Identificação"
          description="O código é único por loja e aparece na vitrine e no PDV."
        />
        <div className="card-pad grid gap-5 sm:grid-cols-2">
          <Field label="Código / SKU" name="code" error={state.fieldErrors?.code}>
            <input
              id="code"
              name="code"
              required
              className="input"
              defaultValue={product?.code ?? ""}
              placeholder="CAM-001"
            />
          </Field>

          <Field label="Código de barras" name="barcode" error={state.fieldErrors?.barcode}>
            <input
              id="barcode"
              name="barcode"
              className="input"
              defaultValue={product?.barcode ?? ""}
              placeholder="7891000000000"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Descrição do produto" name="name" error={state.fieldErrors?.name}>
              <input
                id="name"
                name="name"
                required
                className="input"
                defaultValue={product?.name ?? ""}
                placeholder="Camiseta básica algodão"
              />
            </Field>
          </div>

          <Field label="Tipo / nicho" name="categoryId" error={state.fieldErrors?.categoryId}>
            <select
              id="categoryId"
              name="categoryId"
              className="input"
              defaultValue={product?.categoryId ?? ""}
            >
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unidade" name="unit" error={state.fieldErrors?.unit}>
            <select
              id="unit"
              name="unit"
              className="input"
              defaultValue={product?.unit ?? "UN"}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Detalhes"
              name="description"
              error={state.fieldErrors?.description}
              hint="Texto exibido na página do produto na vitrine."
            >
              <textarea
                id="description"
                name="description"
                rows={4}
                className="input"
                defaultValue={product?.description ?? ""}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <span className="label">Fotos</span>
            <ImageUploader initialUrls={product?.images ?? []} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Preço e estoque"
          description="Endereço de estoque ajuda a localizar o item na prateleira."
        />
        <div className="card-pad grid gap-5 sm:grid-cols-2">
          <Field label="Preço de venda (R$)" name="priceCents" error={state.fieldErrors?.priceCents}>
            <input
              id="priceCents"
              name="priceCents"
              inputMode="decimal"
              className="input"
              defaultValue={centsToInput(product?.priceCents ?? 0)}
              placeholder="0,00"
            />
          </Field>

          <Field label="Custo (R$)" name="costCents" error={state.fieldErrors?.costCents}>
            <input
              id="costCents"
              name="costCents"
              inputMode="decimal"
              className="input"
              defaultValue={centsToInput(product?.costCents ?? 0)}
              placeholder="0,00"
            />
          </Field>

          <Field
            label="Quantidade em estoque"
            name="quantity"
            error={state.fieldErrors?.quantity}
            hint={
              isEdit
                ? "Alterar aqui gera um ajuste registrado no histórico."
                : "Gera uma entrada de estoque inicial."
            }
          >
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              step={1}
              className="input"
              defaultValue={product?.quantity ?? 0}
            />
          </Field>

          <Field
            label="Estoque mínimo"
            name="minQuantity"
            error={state.fieldErrors?.minQuantity}
            hint="Usado no alerta de reposição do painel."
          >
            <input
              id="minQuantity"
              name="minQuantity"
              type="number"
              min={0}
              step={1}
              className="input"
              defaultValue={product?.minQuantity ?? 0}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Endereço no estoque"
              name="location"
              error={state.fieldErrors?.location}
              hint="Ex.: Corredor B, prateleira 3, caixa 12."
            >
              <input
                id="location"
                name="location"
                className="input"
                defaultValue={product?.location ?? ""}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product?.active ?? true}
              className="size-4 rounded border-ink-300"
            />
            <span className="text-sm text-ink-700">
              Produto ativo (aparece no PDV e na vitrine)
            </span>
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <SubmitButton>{isEdit ? "Salvar alterações" : "Cadastrar produto"}</SubmitButton>
        <Link href="/estoque" className="btn btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
