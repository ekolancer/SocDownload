'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconMenu,
  IconSearch,
  IconSettings,
  IconActivity,
} from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api';
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
  const { openMobileSidebar, openCommandPalette, openAdaptersDrawer } = useLayoutStore();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await apiFetch('/api/health', {
          signal: AbortSignal.timeout(4000),
        });
        if (active) setOnline(response.ok);
      } catch {
        if (active) setOnline(false);
      }
    };

    check();
    const timer = window.setInterval(check, 25000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070b10]/80 px-4 py-3.5 backdrop-blur-2xl sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white md:hidden"
            aria-label="Open navigation menu"
          >
            <IconMenu className="h-5 w-5" />
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

        {/* Right: Quick Search Button, Actions Slot, Heartbeat, Settings */}
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          {/* Quick Search / Command Palette Trigger */}
          <button
            type="button"
            onClick={openCommandPalette}
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-cyan-400/30 hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="Search or run command (⌘K)"
          >
            <IconSearch className="h-3.5 w-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="hidden sm:inline font-medium">Quick search...</span>
            <kbd className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 group-hover:text-cyan-300 transition-colors">
              ⌘K
            </kbd>
          </button>

          {/* Dynamic Page Actions Slot */}
          {actions}

          {/* Heartbeat Status Indicator */}
          <button
            type="button"
            onClick={openAdaptersDrawer}
            className={`group flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-mono font-bold transition-all ${
              online === true
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-400/20'
                : online === false
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-300 hover:border-rose-400/50 hover:bg-rose-400/20'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            }`}
            title="Click to inspect platform adapters"
            aria-label="Server status: click to inspect adapters"
          >
            <span className="relative flex h-2 w-2">
              {online === true ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </>
              ) : online === false ? (
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
              ) : (
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </span>
            <span className="hidden sm:inline">
              {online === true ? 'Online' : online === false ? 'Offline' : 'Connecting'}
            </span>
          </button>

          {/* Settings Shortcut */}
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-400/40 hover:bg-white/[0.05] hover:text-cyan-300"
            aria-label="Open settings"
            title="Settings (⌘4)"
          >
            <IconSettings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
