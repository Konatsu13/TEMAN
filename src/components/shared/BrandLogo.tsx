import { useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-14 w-14 rounded-2xl',
};

export function BrandLogo({
  size = 'md',
  showWordmark = true,
  showSubtitle = false,
  className = '',
}: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-700 dark:bg-slate-800`}
      >
        {!imgError ? (
          <img
            src="/logo.png"
            alt="Logo TEMAN"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="font-display text-sm font-bold text-blue-600 dark:text-blue-400">T</span>
        )}
      </div>

      {showWordmark && (
        <div className="min-w-0 leading-tight">
          <div className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-100">
            TEMAN
          </div>
          {showSubtitle && (
            <div className="text-xs text-slate-500 whitespace-nowrap dark:text-slate-400">
              Team Management
            </div>
          )}
        </div>
      )}
    </div>
  );
}
