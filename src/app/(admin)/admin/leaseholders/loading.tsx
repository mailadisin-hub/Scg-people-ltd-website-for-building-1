import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function LeaseholdersLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <TableSkeleton rows={10} cols={4} />
    </div>
  );
}
