import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-7 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5 sm:col-span-2">
          <Skeleton className="h-4 w-28 mb-2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
      <CardSkeleton rows={5} />
    </div>
  );
}
