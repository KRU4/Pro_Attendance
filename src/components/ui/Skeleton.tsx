import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-cell bg-border/60", className)}
      aria-hidden
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-1">
          <Skeleton className="h-10 w-32 shrink-0" />
          {Array.from({ length: 15 }).map((_, j) => (
            <Skeleton key={j} className="h-10 w-10 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  );
}
