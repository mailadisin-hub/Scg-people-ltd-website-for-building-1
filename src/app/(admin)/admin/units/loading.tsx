import { Skeleton } from "@/components/ui/skeleton";

export default function UnitsLoading() {
  return (
    <div>
      <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-40 mb-3" />
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
