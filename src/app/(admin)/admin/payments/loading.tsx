import { CardSkeleton } from "@/components/ui/skeleton";

export default function PaymentsLoading() {
  return (
    <div>
      <div className="h-8 w-28 bg-gray-200 rounded animate-pulse mb-6 md:mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardSkeleton rows={6} />
        <div className="lg:col-span-2">
          <CardSkeleton rows={8} />
        </div>
      </div>
    </div>
  );
}
