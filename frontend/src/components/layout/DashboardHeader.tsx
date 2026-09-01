'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconMenu, IconSearch } from '@/components/ui/Icons';
import { useLayoutStore } from '@/lib/useLayoutStore';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function DashboardHeader({
  title,
  description,
  actions,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const { openMobileSidebar, openCommandPalette } = useLayoutStore();
  const isStudio = pathname === '/';

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070b10]/80 px-4 py-3.5 backdrop-blur-2xl sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left: Mobile Drawer Trigger & Page Title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white md:hidden cursor-pointer"
            aria-label="Open navigation menu"
          >
            <IconMenu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-white sm:text-xl md:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Quick Search (non-Studio) & Dynamic Page Actions */}
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          {/* Quick Search / Command Palette Trigger (Hidden on Studio) */}
          {!isStudio && (
            <button
              type="button"
              onClick={openCommandPalette}
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-cyan-400/30 hover:bg-white/[0.06] hover:text-slate-200 cursor-pointer"
              aria-label="Search or run command (⌘K)"
            >
              <IconSearch className="h-3.5 w-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="hidden sm:inline font-medium">Quick search...</span>
              <kbd className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 group-hover:text-cyan-300 transition-colors">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Dynamic Page Actions Slot */}
          {actions}
        </div>
      </div>
    </header>
  );
}
