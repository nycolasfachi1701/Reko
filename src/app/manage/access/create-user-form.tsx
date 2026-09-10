"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { createUserAction, type CreateUserState } from "../actions";

const initial: CreateUserState = {};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required minLength={2} placeholder="Maria Silva" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="maria@nstech.com.br"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="ao menos 8 caracteres"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Papel</Label>
          <select
            id="role"
            name="role"
            defaultValue="VIEWER"
            className="h-10 rounded-sm border border-[var(--border)] bg-surface-2 px-3 text-sm text-fg-hi outline-none focus:border-brand"
          >
            <option value="VIEWER">Espectador</option>
            <option value="MANAGER">Gestor</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-negative">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          className="rounded-sm border border-[var(--border)] px-3 py-2 text-sm text-positive"
          style={{ backgroundColor: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
        >
          {state.ok}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Criando…" : "Criar usuário"}
      </Button>
    </form>
  );
}
