import { TableSkeleton } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
