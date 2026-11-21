import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'subtle'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-contrast)] border-transparent hover:bg-[var(--primary-hover)] active:opacity-90 shadow-xs',
  secondary:
    'bg-[var(--surface-bg)] text-[var(--text-main)] border-[var(--surface-border)] hover:bg-[var(--surface-hover)] shadow-xs',
  outline:
    'bg-transparent text-[var(--text-sub)] border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]',
  subtle:
    'bg-[var(--surface-elevated)] text-[var(--text-sub)] border-transparent hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]',
  ghost:
    'bg-transparent text-[var(--text-sub)] border-transparent hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]',
  danger:
    'bg-[var(--danger)] text-white border-transparent hover:brightness-90 active:brightness-80 shadow-xs',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2.5 rounded-lg font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap shrink-0 border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0"
        />
      ) : (
        leftIcon
      )}
      {children && <span className="truncate">{children}</span>}
      {!isLoading && rightIcon}
    </button>
  );
}
