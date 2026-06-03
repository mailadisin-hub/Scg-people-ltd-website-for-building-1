import { CardSkeleton } from "@/components/ui/skeleton";

export default function BudgetLoading() {
  return (
    <div>
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-52 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardSkeleton rows={8} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}
