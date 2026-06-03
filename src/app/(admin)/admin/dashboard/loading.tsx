import { KpiCardSkeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-36 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}
