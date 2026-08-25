'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconSettings } from './Icons';
import { JobStats } from './JobPipeline';

type BackendStatus = 'loading' | 'ok' | 'offline';

interface NavbarProps {
  backendStatus: BackendStatus;
  mediaCount: number;
  activeJobsCount: number;
  queueStats?: JobStats | null;
  onOpenImport: () => void;
  onOpenAdapters: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Navbar({
  backendStatus,
  mediaCount,
  activeJobsCount,
  queueStats,
  onOpenImport,
  onOpenAdapters,
  onRefresh,
  isRefreshing = false,
}: NavbarProps) {
  const pathname = usePathname();
  const isVaultPage = pathname === '/vault';

  return (
    <header className="glass-panel top-0 sticky z-50 w-full transition-all">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-8 py-3 max-w-[1440px] mx-auto">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105 cursor-pointer">
            M
          </div>
          <span className="text-xl font-bold text-slate-900 cursor-pointer">
            MediaVault
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 p-1 glass-panel rounded-full shadow-2xs">
          <Link
            href="/"
            className={`rounded-full px-6 py-1.5 font-bold transition-all active:scale-95 text-xs sm:text-sm ${
              !isVaultPage
                ? 'text-white bg-slate-900 shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Studio
          </Link>
          <Link
            href="/vault"
            className={`rounded-full px-6 py-1.5 font-bold transition-all active:scale-95 text-xs sm:text-sm ${
              isVaultPage
                ? 'text-white bg-slate-900 shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Vault
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAdapters}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 hover:shadow-md transition-all duration-300 active:scale-95 text-slate-700 cursor-pointer"
            title="Inspect Adapters & System Health"
          >
            <IconSettings className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
