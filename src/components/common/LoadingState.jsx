'use client';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingState({ rows = 4, type = 'cards' }) {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-28 mb-2" />
            <Skeleton className="h-2 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array(rows).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}