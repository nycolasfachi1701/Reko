"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { assignUsers, unassign } from "../actions";

interface Assignee {
  id: string; // id da atribuição
  name: string;
  email: string | null;
  dueDate: string | null; // ISO
  completed: number;
}
interface PickUser {
  id: string;
  name: string;
  email: string | null;
}

export function TrackAssignments({
  trackId,
  totalVideos,
  assignees,
  availableUsers,
}: {
  trackId: string;
  totalVideos: number;
  assignees: Assignee[];
  availableUsers: PickUser[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [due, setDue] = useState("");

  function run(fn: () => Promise<unknown>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha na operação.");
      }
    });
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function statusOf(a: Assignee): { label: string; tone: "done" | "doing" | "none" } {
    if (totalVideos > 0 && a.completed >= totalVideos) return { label: "Concluída", tone: "done" };
    if (a.completed > 0) return { label: `${a.completed}/${totalVideos}`, tone: "doing" };
    return { label: "Não iniciada", tone: "none" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <section className="mt-10">
      <h2 className="mb-1 font-display text-lg font-bold">Atribuição e conclusão</h2>
      <p className="mb-4 text-sm text-fg-lo">
        Defina quem deve fazer esta trilha. O progresso vem do que cada um já assistiu.
      </p>

      {/* Atribuir */}
      <Card className="mb-6 p-5">
        {availableUsers.length === 0 ? (
          <p className="text-sm text-fg-mut">Todos os usuários já estão atribuídos.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Usuários</Label>
              <div className="max-h-52 overflow-y-auto rounded-sm border border-[var(--border)]">
                {availableUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0 hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      disabled={pending}
                      className="accent-[var(--brand)]"
                    />
                    <span className="min-w-0 truncate">
                      {u.name}
                      {u.email ? <span className="text-fg-mut"> · {u.email}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="due">Prazo (opcional)</Label>
                <Input
                  id="due"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  disabled={pending}
                  className="w-44"
                />
              </div>
              <Button
                type="button"
                disabled={pending || selected.size === 0}
                onClick={() => {
                  const ids = [...selected];
                  setSelected(new Set());
                  run(() => assignUsers(trackId, ids, due || null));
                }}
              >
                {pending ? "Atribuindo…" : `Atribuir${selected.size ? ` (${selected.size})` : ""}`}
              </Button>
            </div>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-negative">
            {error}
          </p>
        ) : null}
      </Card>

      {/* Conclusão */}
      {assignees.length === 0 ? (
        <p className="text-sm text-fg-mut">Ninguém atribuído ainda.</p>
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {assignees.map((a) => {
            const s = statusOf(a);
            const overdue =
              a.dueDate != null && s.tone !== "done" && new Date(a.dueDate) < today;
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-fg-mut">
                    {a.email ?? "sem e-mail"}
                    {a.dueDate ? (
                      <span className={overdue ? "text-negative" : ""}>
                        {" · prazo "}
                        {new Date(a.dueDate).toLocaleDateString("pt-BR")}
                        {overdue ? " (vencido)" : ""}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs"
                    style={
                      s.tone === "done"
                        ? { background: "color-mix(in srgb, var(--positive) 16%, transparent)", color: "var(--positive)" }
                        : s.tone === "doing"
                          ? { background: "var(--brand-soft)", color: "var(--brand)" }
                          : { background: "var(--surface-2)", color: "var(--text-mut)" }
                    }
                  >
                    {s.label}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => unassign(a.id))}
                    className="text-xs text-fg-mut transition-colors hover:text-negative disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}
