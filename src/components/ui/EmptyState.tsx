import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div
        role="region"
        aria-label={title}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center dark:border-slate-800 dark:bg-slate-900/60 ${className}`}
      >
        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300"
        >
          {icon}
        </div>
        <h3 className="mt-3 font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h3>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-white p-10 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900/60 ${className}`}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {icon}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-6 flex items-center gap-3">{action}</div>}
    </div>
  );
}
