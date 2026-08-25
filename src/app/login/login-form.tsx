"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="voce@nstech.com.br"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded border border-[var(--negative)] px-3 py-2 text-sm text-negative"
          style={{
            backgroundColor: "color-mix(in srgb, var(--negative) 12%, transparent)",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1 w-full py-2.5">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
