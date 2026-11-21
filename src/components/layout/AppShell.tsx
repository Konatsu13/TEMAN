import type { ReactNode } from 'react';
import { AIQueryAssistant } from '../shared/AIQueryAssistant';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="flex min-h-dvh"
      style={{ backgroundColor: 'var(--canvas-bg)', color: 'var(--text-main)' }}
    >
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>
      </div>

      <MobileBottomNav />
      <AIQueryAssistant />
    </div>
  );
}
