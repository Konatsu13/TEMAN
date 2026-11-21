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
      'bg-[var(--surface-bg)] border-[var(--surface-border)] shadow-xs',
    subtle:
      'bg-[var(--surface-elevated)] border-[var(--surface-border)]',
    interactive:
      'bg-[var(--surface-bg)] border-[var(--surface-border)] shadow-xs hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-150',
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
      className={`font-display text-base font-semibold text-[var(--text-main)] ${className}`}
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
      className={`text-xs text-[var(--text-sub)] ${className}`}
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
      className={`flex items-center justify-between border-t border-[var(--surface-border)] px-5 py-3.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
