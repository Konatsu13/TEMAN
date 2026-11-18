import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-800/80">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? 'w-48' : i === 1 ? 'w-24' : 'w-20'}`}
        />
      ))}
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-slate-200/60 bg-slate-100/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-6 rounded-full" />
      </div>
      <div className="space-y-2.5">
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 h-3 w-28" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-20" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat konten halaman">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <StatCardSkeleton key={item} />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3, 4].map((row) => (
            <TableRowSkeleton key={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-2 py-1">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mt-8 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
            <Skeleton key={idx} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-9 w-56 sm:block rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </header>
        <main className="flex-1 p-6">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}
