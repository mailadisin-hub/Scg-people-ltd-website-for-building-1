import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 md:mb-8">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white shadow-sm p-6", className)}>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
      <Skeleton className="h-9 w-9 rounded-lg mb-3" />
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-7 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-6">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4" style={{ width: `${[120, 80, 100, 60][j % 4]}px` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
