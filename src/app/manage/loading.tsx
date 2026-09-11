import { Skeleton } from "@/components/ui";

// Esqueleto genérico da área de gestão enquanto os dados carregam.
export default function LoadingManage() {
  return (
    <div className="min-h-screen">
      <div className="h-[68px] border-b border-[var(--border)]" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Skeleton className="h-8 w-56 rounded-md" />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-10 h-64 w-full rounded-lg" />
      </main>
    </div>
  );
}
