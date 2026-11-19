import { useEffect, useState } from 'react';
import { BrandLogo } from '../shared/BrandLogo';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export function SplashScreen({ onComplete, durationMs = 800 }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setFadingOut(true);
    }, Math.max(200, durationMs - 200));

    const doneTimer = window.setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [durationMs, onComplete]);

  return (
    <div
      role="status"
      aria-label="Memuat aplikasi TEMAN"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-slate-900 transition-opacity duration-200 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="animate-teman-splash relative flex flex-col items-center gap-4 px-6 text-center">
        <BrandLogo size="md" showWordmark={false} />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            TEMAN
          </h1>
          <p className="mt-1 text-xs font-medium tracking-wide text-slate-500">
            Team Management System
          </p>
        </div>

        <div className="mt-2 h-1 w-28 overflow-hidden rounded-full bg-slate-200">
          <div className="animate-teman-bar h-full w-full bg-blue-600" />
        </div>
      </div>
    </div>
  );
}
