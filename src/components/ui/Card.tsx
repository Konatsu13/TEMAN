import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'subtle' | 'interactive';
}

export function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      'bg-white border-slate-200/90 shadow-xs dark:bg-slate-900 dark:border-slate-800/80',
    subtle:
      'bg-slate-50/60 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800/60',
    interactive:
      'bg-white border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 transition-all duration-150',
  };

  return (
    <div
      className={`rounded-xl border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-1.5 p-5 pb-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-display text-base font-semibold text-slate-900 dark:text-slate-100 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-xs text-slate-500 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 pt-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800/80 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
