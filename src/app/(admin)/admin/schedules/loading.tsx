import { CardSkeleton } from "@/components/ui/skeleton";

export default function SchedulesLoading() {
  return (
    <div>
      <div className="h-8 w-52 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={6} />
      </div>
    </div>
  );
}
