'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDownload,
  IconArchive,
  IconRefresh,
  IconFolder,
} from './Icons';
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
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Symmetrical Squircle App Icon */}
            <div className="w-9 h-9 rounded-[9px] bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <IconDownload className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                Media<span className="text-indigo-600">Vault</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Segmented Navigation Bar */}
        <nav className="relative flex items-center p-1 rounded-[14px] bg-slate-100/90 border border-slate-200">
          {/* Studio Tab */}
          <Link
            href="/"
            className={`relative flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-[10px] text-xs font-bold transition-colors z-10 ${
              !isVaultPage
                ? 'bg-white text-indigo-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <IconDownload className="w-3.5 h-3.5" />
            <span>Studio</span>
            {activeJobsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </Link>

          {/* Vault Tab */}
          <Link
            href="/vault"
            className={`relative flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-[10px] text-xs font-bold transition-colors z-10 ${
              isVaultPage
                ? 'bg-white text-indigo-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <IconFolder className="w-3.5 h-3.5" />
            <span>Vault</span>
          </Link>
        </nav>

        {/* Right: Assist Chips & Actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Adapter Health Chip */}
          <button
            type="button"
            onClick={onOpenAdapters}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-sm"
            title="Inspect Platform Adapters"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'ok'
                  ? 'bg-emerald-500'
                  : backendStatus === 'loading'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="hidden md:inline font-mono text-[11px]">
              {backendStatus === 'ok' ? 'Online' : 'Checking...'}
            </span>
          </button>

          {/* Import Archive Button */}
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-sm"
            title="Import Legacy JSON"
          >
            <IconArchive className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Import</span>
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-[9px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm aspect-square"
            title="Sync library"
          >
            <IconRefresh
              className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
            />
          </button>
        </div>

      </div>
    </header>
  );
}
