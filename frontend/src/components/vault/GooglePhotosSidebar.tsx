'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconGooglePhotos,
  IconPhoto,
  IconUsers,
  IconLayers,
  IconStar,
  IconUpload,
  IconAdapter,
  IconZap,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
} from '@/components/ui/Icons';

export type GooglePhotosTab = 'photos' | 'explore' | 'albums' | 'favorites';

interface GooglePhotosSidebarProps {
  currentTab: GooglePhotosTab;
  onTabChange: (tab: GooglePhotosTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  stats?: {
    totalMedia: number;
    totalAlbums: number;
    totalCreators: number;
    totalFavorites: number;
    storageHumanSize?: string;
    totalBytes?: number;
  };

  backendStatus: 'loading' | 'ok' | 'offline';
  onOpenImport: () => void;
  onOpenAdapters: () => void;
}

export function GooglePhotosSidebar({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  stats = { totalMedia: 0, totalAlbums: 0, totalCreators: 0, totalFavorites: 0 },
  backendStatus,
  onOpenImport,
  onOpenAdapters,
}: GooglePhotosSidebarProps) {
  
  const navItems = [
    {
      id: 'photos' as GooglePhotosTab,
      label: 'Foto & Video',
      icon: IconPhoto,
      count: stats.totalMedia,
      color: 'text-indigo-600',
    },
    {
      id: 'explore' as GooglePhotosTab,
      label: 'Kreator',
      icon: IconUsers,
      count: stats.totalCreators,
      color: 'text-purple-600',
    },
    {
      id: 'albums' as GooglePhotosTab,
      label: 'Album',
      icon: IconLayers,
      count: stats.totalAlbums,
      color: 'text-pink-600',
    },
    {
      id: 'favorites' as GooglePhotosTab,
      label: 'Favorit',
      icon: IconStar,
      count: stats.totalFavorites,
      color: 'text-amber-500',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Enclosure (Studio Glass-Panel Theme) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 glass-panel bg-white/70 backdrop-blur-2xl border-r border-white/60 flex flex-col justify-between transition-all duration-300 select-none shadow-[4px_0_30px_rgba(31,38,135,0.06)] ${
          isMobileOpen
            ? 'translate-x-0 w-72 p-4'
            : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[76px] lg:p-3' : 'lg:w-64 lg:p-4'
        }`}
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Google Photos Pinwheel Logo Badge */}
              <div className="w-10 h-10 rounded-2xl bg-white/90 border border-white/80 shadow-xs flex items-center justify-center shrink-0">
                <IconGooglePhotos className="w-6 h-6 drop-shadow-xs" />
              </div>

              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-base font-black text-slate-900 tracking-tight leading-none truncate">
                    MediaVault
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600/80 mt-1">
                    Photos & Vault
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 border border-transparent hover:border-white/60 flex items-center justify-center lg:hidden cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    onCloseMobile();
                  }}
                  title={item.label}
                  className={`relative group flex items-center rounded-2xl transition-all duration-200 cursor-pointer ${
                    isCollapsed && !isMobileOpen
                      ? 'justify-center p-3 h-12 w-12 mx-auto'
                      : 'justify-between px-3.5 py-2.5 w-full'
                  } ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 font-bold scale-[1.02]'
                      : 'glass-panel hover:bg-white/90 text-slate-700 font-semibold hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.color
                    }`} />

                    {(!isCollapsed || isMobileOpen) && (
                      <span className="text-sm tracking-tight">{item.label}</span>
                    )}
                  </div>

                  {/* Item Counter Pill */}
                  {(!isCollapsed || isMobileOpen) && item.count > 0 && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/80 border border-white/60 text-slate-600 shadow-2xs'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Utility Actions Section */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-white/50">
            {/* Import Archive Button */}
            <button
              type="button"
              onClick={onOpenImport}
              title="Import JSON/HTML Export"
              className={`flex items-center rounded-2xl glass-panel hover:bg-white/90 text-slate-700 hover:text-indigo-700 transition-all cursor-pointer shadow-2xs ${
                isCollapsed && !isMobileOpen
                  ? 'justify-center p-3 h-12 w-12 mx-auto'
                  : 'gap-3 px-3.5 py-2.5 w-full'
              }`}
            >
              <IconUpload className="w-5 h-5 text-indigo-500 shrink-0" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-xs font-bold tracking-tight">Import Archive</span>
              )}
            </button>

            {/* Adapters & Engine Status */}
            <button
              type="button"
              onClick={onOpenAdapters}
              title="Platform Adapters"
              className={`flex items-center rounded-2xl glass-panel hover:bg-white/90 text-slate-700 hover:text-purple-700 transition-all cursor-pointer shadow-2xs ${
                isCollapsed && !isMobileOpen
                  ? 'justify-center p-3 h-12 w-12 mx-auto'
                  : 'gap-3 px-3.5 py-2.5 w-full'
              }`}
            >
              <IconAdapter className="w-5 h-5 text-purple-500 shrink-0" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-xs font-bold tracking-tight">Adapters Status</span>
              )}
            </button>

            {/* Switch to Download Studio */}
            <Link
              href="/"
              title="Download Studio"
              className={`flex items-center rounded-2xl glass-panel hover:bg-white/90 text-slate-700 hover:text-slate-900 transition-all shadow-2xs ${
                isCollapsed && !isMobileOpen
                  ? 'justify-center p-3 h-12 w-12 mx-auto'
                  : 'gap-3 px-3.5 py-2.5 w-full'
              }`}
            >
              <IconZap className="w-5 h-5 text-amber-500 shrink-0" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-xs font-bold tracking-tight">Download Studio</span>
              )}
            </Link>
          </div>
        </div>

        {/* Bottom Collapse Toggle & System Telemetry */}
        <div className="flex flex-col gap-3 pt-3 border-t border-white/50">
          {/* Storage Telemetry (when expanded) */}
          {(!isCollapsed || isMobileOpen) && (
            <div className="p-3 rounded-2xl glass-panel bg-white/50 border border-white/70 flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Penyimpanan Vault</span>
                <span className="font-mono text-indigo-700 font-extrabold text-xs">
                  {stats.storageHumanSize || '0 MB'}
                </span>
              </div>
              
              {/* Progress bar indication */}
              <div className="w-full h-1.5 rounded-full bg-slate-200/60 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-xs transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        8,
                        stats.totalBytes
                          ? (stats.totalBytes / (5 * 1024 * 1024 * 1024)) * 100
                          : (stats.totalMedia / 500) * 100
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-0.5">
                <span className="flex items-center gap-1 font-semibold">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    backendStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span>{stats.totalMedia} Media</span>
                </span>
                <span className="font-semibold">{stats.totalAlbums} Album</span>
              </div>
            </div>
          )}


          {/* Desktop Collapse / Expand Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer w-full"
          >
            {isCollapsed ? (
              <IconChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <IconChevronLeft className="w-4 h-4" />
                <span>Ciutkan Menu</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
