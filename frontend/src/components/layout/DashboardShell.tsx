'use client';

import React, { ReactNode, useEffect } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { AdapterHealthDrawer } from '@/components/modals/AdapterHealthDrawer';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { useLayoutStore } from '@/lib/useLayoutStore';
import { useDashboardShortcuts } from '@/lib/useDashboardShortcuts';

interface DashboardShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  title,
  description,
  actions,
  children,
}: DashboardShellProps) {
  const {
    sidebarCollapsed,
    mobileSidebarOpen,
    closeMobileSidebar,
    adaptersDrawerOpen,
    closeAdaptersDrawer,
  } = useLayoutStore();

  // Mount global keyboard navigation & command palette shortcuts
  useDashboardShortcuts();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-[#070b10] text-white selection:bg-cyan-500/30 selection:text-white">
      {/* 1. Collapsible Sidebar */}
      <DashboardSidebar />

      {/* 2. Mobile Backdrop */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs transition-opacity md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* 3. Main Dynamic Content View (Margin dynamically synchronized with sidebar state) */}
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-72'
        }`}
      >
        {/* Header */}
        <DashboardHeader
          title={title}
          description={description}
          actions={actions}
        />

        {/* Primary Page Landmark */}
        <main className="mx-auto w-full max-w-[1440px] flex-grow px-4 py-6 sm:px-6 md:px-8">
          {children}
        </main>
      </div>

      {/* 4. Global Modals & Drawers */}
      <CommandPalette />
      <AdapterHealthDrawer
        isOpen={adaptersDrawerOpen}
        onClose={closeAdaptersDrawer}
      />
    </div>
  );
}
