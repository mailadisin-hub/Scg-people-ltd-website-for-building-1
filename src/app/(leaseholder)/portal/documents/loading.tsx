import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-4 w-40 mb-8" />
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
