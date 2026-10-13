import Link from "next/link";
import { Check, CircleOff, Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  cancelEntryAction,
  deleteFinancialEntryAction,
  markPaidAction,
  reopenEntryAction,
} from "@/app/actions/finance";

type EntryStatus = "PENDENTE" | "PAGO" | "CANCELADO";

const BUTTON = "btn btn-ghost px-2.5 py-1.5 text-xs";

/**
 * Ações de um lançamento. O formulário de edição é aberto pela query `?edit=`,
 * tratada na própria página `/financeiro`.
 */
export function EntryActions({
  entryId,
  status,
  editHref,
}: {
  entryId: string;
  status: EntryStatus;
  editHref: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {status === "PENDENTE" ? (
        <form action={markPaidAction}>
          <input type="hidden" name="id" value={entryId} />
          <button
            type="submit"
            className={BUTTON}
            title="Marcar como pago"
            aria-label="Marcar como pago"
          >
            <Check className="size-4" />
          </button>
        </form>
      ) : (
        <form action={reopenEntryAction}>
          <input type="hidden" name="id" value={entryId} />
          <button
            type="submit"
            className={BUTTON}
            title="Reabrir (voltar para pendente)"
            aria-label="Reabrir"
          >
            <RotateCcw className="size-4" />
          </button>
        </form>
      )}

      {status !== "CANCELADO" ? (
        <form action={cancelEntryAction}>
          <input type="hidden" name="id" value={entryId} />
          <button
            type="submit"
            className={BUTTON}
            title="Cancelar lançamento"
            aria-label="Cancelar lançamento"
          >
            <CircleOff className="size-4" />
          </button>
        </form>
      ) : null}

      <Link
        href={editHref}
        className={BUTTON}
        title="Editar lançamento"
        aria-label="Editar lançamento"
      >
        <Pencil className="size-4" />
      </Link>

      <form action={deleteFinancialEntryAction}>
        <input type="hidden" name="id" value={entryId} />
        <button
          type="submit"
          className="btn btn-danger px-2.5 py-1.5 text-xs"
          title="Excluir lançamento"
          aria-label="Excluir lançamento"
        >
          <Trash2 className="size-4" />
        </button>
      </form>
    </div>
  );
}
