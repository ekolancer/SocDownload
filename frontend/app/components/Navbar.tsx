'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconMediaVault,
  IconSparkles,
  IconLayers,
  IconShieldCheck,
  IconUpload,
  IconRefresh,
} from './Icons';

interface NavbarProps {
  backendStatus: 'loading' | 'ok' | 'offline';
  mediaCount: number;
  activeJobsCount: number;
  onOpenImport: () => void;
  onOpenAdapters: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Navbar({
  backendStatus,
  mediaCount,
  activeJobsCount,
  onOpenImport,
  onOpenAdapters,
  onRefresh,
  isRefreshing,
}: NavbarProps) {
  const pathname = usePathname() || '/';

  return (
    <header className="sticky top-4 z-40 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-2xl bg-[#EEF2F7] shadow-[8px_8px_18px_#cbd5e1,-8px_-8px_18px_#ffffff] border border-white/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 transition-all duration-300">
        
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="p-1.5 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff] group-hover:scale-105 transition-transform duration-200">
            <IconMediaVault className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-800 font-sans">
                Media<span className="text-indigo-600">Vault</span>
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                v2.0
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
              Personal Archiving Studio
            </span>
          </div>
        </Link>

        {/* Center: Navigation Menu Switcher (Studio vs Media Vault) */}
        <nav className="flex items-center p-1 rounded-xl bg-[#E5EBF2] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]">
          <Link
            href="/"
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              pathname === '/'
                ? 'bg-[#EEF2F7] text-indigo-600 shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <IconSparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Studio</span>
            {activeJobsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </Link>

          <Link
            href="/vault"
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              pathname === '/vault'
                ? 'bg-[#EEF2F7] text-indigo-600 shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <IconLayers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Media Vault</span>
            {mediaCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[12px] font-mono bg-indigo-100 text-indigo-700 font-semibold">
                {mediaCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Right Actions: Backend Status Pill (Relocated) + Adapters + Import + Refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Relocated Backend Status Pill (Directly next to Adapters Health) */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff] ${
              backendStatus === 'ok'
                ? 'bg-emerald-50/60 text-emerald-700 border border-emerald-200/50'
                : backendStatus === 'loading'
                ? 'bg-amber-50/60 text-amber-700 border border-amber-200/50'
                : 'bg-rose-50/60 text-rose-700 border border-rose-200/50'
            }`}
            title="Backend Server Status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'ok'
                  ? 'bg-emerald-500 animate-pulse'
                  : backendStatus === 'loading'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span>{backendStatus === 'ok' ? 'Online' : backendStatus === 'loading' ? 'Connecting...' : 'Offline'}</span>
          </div>

          {/* Adapters Health Modal Trigger */}
          <button
            onClick={onOpenAdapters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
            title="Platform Adapters Health"
          >
            <IconShieldCheck className="w-4 h-4 text-indigo-500" />
            <span className="hidden lg:inline">Adapters</span>
          </button>

          {/* Import Archive Modal Trigger */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
            title="Import Platform Archive JSON"
          >
            <IconUpload className="w-4 h-4 text-indigo-500" />
            <span className="hidden lg:inline">Import</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-xl text-slate-600 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer ${
              isRefreshing ? 'opacity-60 pointer-events-none' : ''
            }`}
            title="Refresh Vault & Queue"
          >
            <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
}
