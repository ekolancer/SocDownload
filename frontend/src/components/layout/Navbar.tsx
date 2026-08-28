'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { IconAdapter } from '@/components/ui/Icons';
import { JobStats } from '@/components/studio/JobPipeline';

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
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/60 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
      <div className="relative flex items-center justify-between w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-3">
        
        {/* Left: Brand Identity */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer shrink-0 select-none">
          <div className="relative w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black text-base shadow-md shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-105 group-active:scale-95 border border-emerald-300/30">
            <span className="drop-shadow-xs">M</span>
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
              MediaVault
            </span>
          </div>
        </Link>

        {/* Center: Absolute Centered Premium Navigation Dock */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center p-1 max-w-[calc(100vw-8rem)] overflow-x-auto no-scrollbar bg-slate-900/80 backdrop-blur-xl border border-white/[0.08] rounded-full shadow-[0_2px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] select-none">
          <Link
            href="/"
            className={`relative px-5 sm:px-6 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
              !isVaultPage ? 'text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {!isVaultPage && (
              <motion.div
                layoutId="navbar-active-pill"
                transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                className="absolute inset-0 rounded-full bg-white shadow-md shadow-white/10"
              />
            )}
            <span className="relative z-10">Studio</span>
          </Link>

          <Link
            href="/vault"
            className={`relative px-5 sm:px-6 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
              isVaultPage ? 'text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isVaultPage && (
              <motion.div
                layoutId="navbar-active-pill"
                transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                className="absolute inset-0 rounded-full bg-white shadow-md shadow-white/10"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span>Vault</span>
              {/* {mediaCount > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    isVaultPage
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-800 text-slate-300 border border-white/10'
                  }`}
                >
                  {mediaCount}
                </span>
              )} */}
            </span>
          </Link>
        </nav>

        {/* Right: Actions (Adapters Drawer Trigger) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAdapters}
            className="group flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/[0.08] hover:border-white/20 shadow-2xs hover:shadow-md transition-all duration-300 active:scale-95 text-slate-300 cursor-pointer"
            aria-label="Inspect Platform Adapters & Engine Status"
            title="Inspect Platform Adapters & Engine Status"
          >
            <IconAdapter className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            <span className="hidden md:inline text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              Adapters
            </span>
          </button>
        </div>

      </div>
    </header>
  );
}
