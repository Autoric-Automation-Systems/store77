"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/app/actions/categories";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export function CategoryForm() {
  const [state, formAction] = useActionState(saveCategoryAction, initialState);

  return (
    <Card className="h-fit">
      <CardHeader title="Nova categoria" />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            className="input"
            placeholder="Bebidas, Vestuário, Peças..."
          />
          {state.fieldErrors?.name ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="kind">
            Classificação
          </label>
          <select id="kind" name="kind" className="input" defaultValue="TIPO">
            <option value="TIPO">Tipo de produto</option>
            <option value="NICHO">Nicho da loja</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="input"
            placeholder="Aparece como subtítulo do carrossel na vitrine."
          />
        </div>

        <SubmitButton className="btn btn-primary w-full">Criar categoria</SubmitButton>
      </form>
    </Card>
  );
}

export function DeleteCategoryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <form action={deleteCategoryAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50"
        aria-label={`Excluir ${name}`}
        title={`Excluir ${name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
