import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-32 mb-8" />
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div>
                <Skeleton className="h-4 w-32 mb-1.5" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-16 mb-1.5 ml-auto" />
                <Skeleton className="h-5 w-14 rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
