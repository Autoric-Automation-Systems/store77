"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { UserRole } from "@/db/schema";
import { ROLE_LABELS } from "@/lib/roles";
import {
  changeOwnPasswordAction,
  createTeamMemberAction,
  resetUserPasswordAction,
  updateTeamMemberAction,
} from "@/app/actions/users";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { Alert, Card, CardHeader, Field } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "GERENTE", label: ROLE_LABELS.GERENTE },
  { value: "VENDEDOR", label: ROLE_LABELS.VENDEDOR },
  { value: "CLIENTE", label: ROLE_LABELS.CLIENTE },
];

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: "OWNER", label: ROLE_LABELS.OWNER },
  ...ASSIGNABLE_ROLES,
];

export function TeamMemberForm() {
  const [state, formAction] = useActionState(
    createTeamMemberAction,
    initialState,
  );

  return (
    <Card className="h-fit">
      <CardHeader
        title="Adicionar membro"
        description="A pessoa recebe um e-mail com link para criar a própria senha."
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <Field label="Nome" name="name" error={state.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            required
            className="input"
            placeholder="Nome completo"
          />
        </Field>

        <Field label="E-mail" name="email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className="input"
            placeholder="pessoa@exemplo.com"
          />
        </Field>

        <Field label="Papel" name="role">
          <select id="role" name="role" className="input" defaultValue="VENDEDOR">
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </Field>

        <SubmitButton className="btn btn-primary w-full">
          Enviar convite
        </SubmitButton>
      </form>
    </Card>
  );
}

export function EditMemberForm({
  member,
  roleLocked,
}: {
  member: { id: string; name: string; phone: string | null; role: UserRole };
  roleLocked: boolean;
}) {
  const [state, formAction] = useActionState(
    updateTeamMemberAction,
    initialState,
  );

  return (
    <Card className="h-fit">
      <CardHeader
        title="Editar membro"
        description={member.name}
        action={
          <Link href="/usuarios" className="btn btn-ghost px-3 py-1.5">
            Fechar
          </Link>
        }
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <input type="hidden" name="id" value={member.id} />

        <Field label="Nome" name="edit-name" error={state.fieldErrors?.name}>
          <input
            id="edit-name"
            name="name"
            required
            className="input"
            defaultValue={member.name}
          />
        </Field>

        <Field label="Telefone" name="edit-phone" error={state.fieldErrors?.phone}>
          <input
            id="edit-phone"
            name="phone"
            className="input"
            defaultValue={member.phone ?? ""}
            placeholder="(00) 00000-0000"
          />
        </Field>

        <Field
          label="Papel"
          name="edit-role"
          error={state.fieldErrors?.role}
          hint={roleLocked ? "Este papel não pode ser alterado aqui." : undefined}
        >
          {roleLocked ? (
            <>
              <input type="hidden" name="role" value={member.role} />
              <select
                id="edit-role"
                className="input"
                defaultValue={member.role}
                disabled
              >
                <option value={member.role}>{ROLE_LABELS[member.role]}</option>
              </select>
            </>
          ) : (
            <select
              id="edit-role"
              name="role"
              className="input"
              defaultValue={member.role}
            >
              {ALL_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <SubmitButton className="btn btn-primary w-full">
          Salvar alterações
        </SubmitButton>
      </form>
    </Card>
  );
}

export function ResetPasswordForm({
  member,
}: {
  member: { id: string; name: string };
}) {
  const [state, formAction] = useActionState(
    resetUserPasswordAction,
    initialState,
  );

  return (
    <Card className="h-fit">
      <CardHeader
        title="Redefinir senha"
        description={`Defina uma nova senha para ${member.name}.`}
        action={
          <Link href="/usuarios" className="btn btn-ghost px-3 py-1.5">
            Fechar
          </Link>
        }
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <input type="hidden" name="id" value={member.id} />

        <Field
          label="Nova senha"
          name="reset-password"
          error={state.fieldErrors?.password}
          hint="Mínimo de 8 caracteres."
        >
          <PasswordInput
            id="reset-password"
            name="password"
            required
            autoComplete="new-password"
          />
        </Field>

        <SubmitButton className="btn btn-primary w-full">
          Redefinir senha
        </SubmitButton>
      </form>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(
    changeOwnPasswordAction,
    initialState,
  );

  return (
    <Card className="h-fit">
      <CardHeader
        title="Minha senha"
        description="Atualize a senha usada para entrar no painel."
      />
      <form action={formAction} className="card-pad space-y-4">
        {state.message ? (
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        ) : null}

        <Field
          label="Senha atual"
          name="current-password"
          error={state.fieldErrors?.currentPassword}
        >
          <PasswordInput
            id="current-password"
            name="currentPassword"
            required
            autoComplete="current-password"
          />
        </Field>

        <Field
          label="Nova senha"
          name="new-password"
          error={state.fieldErrors?.newPassword}
          hint="Mínimo de 8 caracteres."
        >
          <PasswordInput
            id="new-password"
            name="newPassword"
            required
            autoComplete="new-password"
          />
        </Field>

        <SubmitButton className="btn btn-primary w-full">
          Alterar senha
        </SubmitButton>
      </form>
    </Card>
  );
}
