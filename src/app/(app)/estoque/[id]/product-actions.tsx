import { Power, Trash2 } from "lucide-react";
import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/actions/products";

export function ProductActions({ productId }: { productId: string }) {
  return (
    <div className="flex gap-2">
      <form action={toggleProductActiveAction}>
        <input type="hidden" name="id" value={productId} />
        <button type="submit" className="btn btn-secondary">
          <Power className="size-4" />
          Ativar / desativar
        </button>
      </form>

      <form action={deleteProductAction}>
        <input type="hidden" name="id" value={productId} />
        <button type="submit" className="btn btn-danger">
          <Trash2 className="size-4" />
          Excluir
        </button>
      </form>
    </div>
  );
}
