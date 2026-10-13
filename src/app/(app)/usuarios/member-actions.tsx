import Link from "next/link";
import { KeyRound, Power, Trash2 } from "lucide-react";
import {
  deleteTeamMemberAction,
  toggleUserActiveAction,
} from "@/app/actions/users";

/**
 * Ações destrutivas são omitidas quando violariam as regras de negócio:
 * a própria linha do usuário (regra 3) e o último OWNER ativo (regra 2).
 */
export function MemberActions({
  member,
}: {
  member: {
    id: string;
    name: string;
    active: boolean;
    isSelf: boolean;
    isLastOwner: boolean;
  };
}) {
  const canToggle = !member.isSelf && !member.isLastOwner;
  const canDelete = !member.isSelf && !member.isLastOwner;
  const toggleLabel = member.active ? "Desativar" : "Ativar";

  return (
    <div className="flex items-center justify-end gap-1">
      {canToggle ? (
        <form action={toggleUserActiveAction}>
          <input type="hidden" name="id" value={member.id} />
          <button
            type="submit"
            className="btn btn-ghost px-2 py-1.5"
            aria-label={`${toggleLabel} ${member.name}`}
            title={`${toggleLabel} ${member.name}`}
          >
            <Power className="size-4" />
          </button>
        </form>
      ) : null}

      <Link
        href={`/usuarios?senha=${member.id}`}
        className="btn btn-ghost px-2 py-1.5"
        aria-label={`Redefinir senha de ${member.name}`}
        title={`Redefinir senha de ${member.name}`}
      >
        <KeyRound className="size-4" />
      </Link>

      {canDelete ? (
        <form action={deleteTeamMemberAction}>
          <input type="hidden" name="id" value={member.id} />
          <button
            type="submit"
            className="btn btn-danger px-2 py-1.5"
            aria-label={`Excluir ${member.name}`}
            title={`Excluir ${member.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
