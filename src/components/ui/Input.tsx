import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-sm font-medium ${
              disabled
                ? 'text-slate-400 dark:text-slate-600'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`h-9 w-full rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-600 ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightElement ? 'pr-11' : 'pr-3'} ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-600 dark:focus:border-rose-500'
                : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/15 dark:border-slate-700 dark:focus:border-blue-500 dark:focus:ring-blue-500/20'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-1.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
