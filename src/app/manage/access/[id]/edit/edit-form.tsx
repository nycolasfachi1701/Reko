"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Button, Input, Label } from "@/components/ui";
import { updateUser } from "../../../actions";

interface Initial {
  name: string;
  email: string;
  role: Role;
}

export function EditUserForm({ id, initial }: { id: string; initial: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [role, setRole] = useState<Role>(initial.role);
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await updateUser({ id, name, email, role, password: password || undefined });
        router.push("/manage/access");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          required
          minLength={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Papel</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={pending}
            className="h-10 rounded-sm border border-[var(--border)] bg-surface-2 px-3 text-sm text-fg-hi outline-none focus:border-brand"
          >
            <option value={Role.VIEWER}>Espectador</option>
            <option value={Role.MANAGER}>Gestor</option>
            <option value={Role.ADMIN}>Administrador</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            minLength={8}
            placeholder="deixe em branco para manter"
            autoComplete="new-password"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => router.push("/manage/access")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
