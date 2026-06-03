import { TableSkeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <div className="h-8 w-28 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
