'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { AdapterHealthDrawer } from '@/components/modals/AdapterHealthDrawer';

export function DashboardShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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
    <div className="linear-dark-bg min-h-screen text-white">
      <DashboardSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onOpenAdapters={() => setAdaptersOpen(true)} />
      {mobileOpen && <button type="button" aria-label="Close dashboard menu" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="min-h-screen transition-[margin] duration-200 md:ml-64" data-dashboard-content>
        <DashboardHeader title={title} description={description} onOpenMenu={() => setMobileOpen(true)} triggerRef={triggerRef} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 md:px-8">{children}</main>
      </div>
      <AdapterHealthDrawer isOpen={adaptersOpen} onClose={() => setAdaptersOpen(false)} />
    </div>
  );
}
