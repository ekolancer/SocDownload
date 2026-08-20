'use client';

import React from 'react';
import {
  IconMediaVault,
  IconActivity,
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
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.07] bg-[#08090D]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-300" />
            <div className="relative p-1.5 bg-[#12141F] rounded-xl border border-white/10 flex items-center justify-center">
              <IconMediaVault className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight gradient-text-brand">MediaVault</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                Studio
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 font-medium -mt-0.5">
              Personal Social Media Downloader
            </p>
          </div>
        </div>

        {/* Center: Live Status & Metrics */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Backend Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#12141F] border border-white/5 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              {backendStatus === 'ok' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </>
              )}
              {backendStatus === 'loading' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse" />
              )}
              {backendStatus === 'offline' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              )}
            </span>
            <span className="text-slate-300">
              {backendStatus === 'ok' ? 'API Online' : backendStatus === 'loading' ? 'Connecting...' : 'API Offline'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-1 rounded-full bg-[#12141F] border border-white/5">
            <span>
              <strong className="text-slate-100 font-mono">{mediaCount}</strong> Saved
            </span>
            <span className="text-slate-600">•</span>
            <span>
              <strong className="text-indigo-300 font-mono">{activeJobsCount}</strong> Active Jobs
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Import JSON Archive Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#141724] hover:bg-[#1C2033] hover:text-white border border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Import Official Archive (Instagram, X, TikTok JSON)"
          >
            <IconUpload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Import Archive</span>
          </button>

          {/* Adapters Health Modal Trigger */}
          <button
            onClick={onOpenAdapters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#141724] hover:bg-[#1C2033] hover:text-white border border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="View Platform Adapters Status"
          >
            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Platform Status</span>
          </button>

          {/* Manual Refresh Trigger */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg text-slate-400 hover:text-white bg-[#141724] hover:bg-[#1C2033] border border-white/10 transition-all cursor-pointer active:scale-90 ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh Data"
            aria-label="Refresh data"
          >
            <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
