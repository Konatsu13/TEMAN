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
    'bg-blue-600 text-white border-transparent hover:bg-blue-700 active:bg-blue-800 shadow-xs dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700',
  secondary:
    'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600',
  outline:
    'bg-transparent text-slate-700 border-slate-300 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800/80 dark:hover:text-slate-100',
  subtle:
    'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200/80 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100',
  ghost:
    'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  danger:
    'bg-rose-600 text-white border-transparent hover:bg-rose-700 active:bg-rose-800 shadow-xs dark:bg-rose-600 dark:hover:bg-rose-500',
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
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap shrink-0 border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none dark:focus-visible:ring-offset-slate-950 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
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
