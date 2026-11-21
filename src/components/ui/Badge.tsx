import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--surface-elevated)] text-[var(--text-sub)] border-[var(--surface-border)]',
  primary:
    'bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/30',
  success: 'app-status-success',
  warning: 'app-status-warning',
  danger: 'app-status-danger',
  info: 'app-status-info',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-[var(--text-mute)]',
  primary: 'bg-[var(--primary)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  info: 'bg-[var(--info)]',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] font-medium leading-none',
  md: 'px-2.5 py-1 text-xs font-medium leading-tight',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border whitespace-nowrap transition-colors duration-150 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}
