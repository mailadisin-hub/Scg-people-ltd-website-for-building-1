import { CardSkeleton } from "@/components/ui/skeleton";

export default function YearsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-36 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <CardSkeleton rows={4} />
    </div>
  );
}
