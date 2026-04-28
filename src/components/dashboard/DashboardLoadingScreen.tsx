import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingScreen() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Dashboard Selector Skeleton */}
      <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border border-border">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Controls Bar Skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Widgets Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Full width widget skeleton */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Half width widgets skeleton */}
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />

        {/* Full width widget skeleton */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Quarter width widgets skeleton */}
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
