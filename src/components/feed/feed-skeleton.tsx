// Skeleton com as MESMAS dimensões do card final — zero layout shift (SPEC §6.1).
export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-video w-full animate-pulse rounded-lg bg-surface-2" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-4/5 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
