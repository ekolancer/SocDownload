'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
    <header className="sticky top-0 z-50 w-full bg-[#EEF2F7]/85 backdrop-blur-xl border-b border-slate-200/70 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group focus:outline-none shrink-0">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-2xl bg-[#EEF2F7] shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff] border border-white/80 transition-shadow"
          >
            <IconMediaVault className="w-6 h-6 sm:w-7 sm:h-7" />
          </motion.div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-800 font-sans">
                Media<span className="text-indigo-600">Vault</span>
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-[1px_1px_3px_#cbd5e1,-1px_-1px_3px_#ffffff]">
                v2.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block leading-normal">
              Personal Archiving Studio
            </span>
          </div>
        </Link>

        {/* Center: Navigation Menu Switcher (Studio vs Media Vault) */}
        <nav className="flex items-center p-1.5 rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff]">
          <Link
            href="/"
            className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              pathname === '/'
                ? 'bg-[#EEF2F7] text-indigo-600 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <IconSparkles className="w-4 h-4 text-indigo-500" />
            <span>Studio</span>
            {activeJobsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </Link>

          <Link
            href="/vault"
            className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              pathname === '/vault'
                ? 'bg-[#EEF2F7] text-indigo-600 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <IconLayers className="w-4 h-4 text-indigo-500" />
            <span>Media Vault</span>
            {mediaCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-100 text-indigo-700 font-bold">
                {mediaCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Right Actions: Backend Status Pill + Adapters + Import + Refresh */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Relocated Backend Status Pill (Directly next to Adapters Health) */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff] ${
              backendStatus === 'ok'
                ? 'bg-emerald-50/70 text-emerald-700 border border-emerald-200/60'
                : backendStatus === 'loading'
                ? 'bg-amber-50/70 text-amber-700 border border-amber-200/60'
                : 'bg-rose-50/70 text-rose-700 border border-rose-200/60'
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenAdapters}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
            title="Platform Adapters Health"
          >
            <IconShieldCheck className="w-4 h-4 text-indigo-500" />
            <span className="hidden lg:inline">Adapters</span>
          </motion.button>

          {/* Import Archive Modal Trigger */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
            title="Import Platform Archive JSON"
          >
            <IconUpload className="w-4 h-4 text-indigo-500" />
            <span className="hidden lg:inline">Import</span>
          </motion.button>

          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2.5 rounded-xl text-slate-600 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer ${
              isRefreshing ? 'opacity-60 pointer-events-none' : ''
            }`}
            title="Refresh Vault & Queue"
          >
            <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </motion.button>
        </div>

      </div>
    </header>
  );
}
