import { Skeleton } from "@/components/ui";

// Esqueleto enquanto a página do vídeo carrega (perceived performance).
export default function LoadingWatch() {
  return (
    <div className="min-h-screen">
      <div className="h-[68px] border-b border-[var(--border)]" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="mt-5 h-7 w-3/4 rounded-md" />
            <div className="mt-4 flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="mt-2 h-3 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="mt-5 h-24 w-full rounded-xl" />
          </div>
          <div className="hidden lg:block">
            <Skeleton className="mb-3 h-6 w-24 rounded" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="aspect-video w-[42%] rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-full rounded" />
                    <Skeleton className="mt-2 h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
