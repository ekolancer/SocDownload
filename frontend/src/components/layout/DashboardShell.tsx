'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { AdapterHealthDrawer } from '@/components/modals/AdapterHealthDrawer';

export function DashboardShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [adaptersOpen, setAdaptersOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', close);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) triggerRef.current?.focus();
  }, [mobileOpen]);

  return (
    <div className="linear-dark-bg min-h-screen p-2 text-white sm:p-4 md:p-6">
      <DashboardSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onOpenAdapters={() => setAdaptersOpen(true)} />
      {mobileOpen && <button type="button" aria-label="Close dashboard menu" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="min-h-[calc(100vh-1rem)] overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0b0e13]/90 shadow-[0_24px_80px_-24px_rgba(0,0,0,.9)] transition-[margin] duration-200 sm:min-h-[calc(100vh-2rem)] md:ml-64" data-dashboard-content>
        <DashboardHeader title={title} description={description} actions={actions} menuOpen={mobileOpen} onOpenMenu={() => setMobileOpen(true)} triggerRef={triggerRef} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 md:px-8">{children}</main>
      </div>
      <AdapterHealthDrawer isOpen={adaptersOpen} onClose={() => setAdaptersOpen(false)} />
    </div>
  );
}
