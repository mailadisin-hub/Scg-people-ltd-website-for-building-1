import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function BudgetLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-40 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-28 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardSkeleton rows={8} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}
