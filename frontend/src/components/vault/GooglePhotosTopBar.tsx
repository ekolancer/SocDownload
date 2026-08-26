'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconMenu,
  IconSearch,
  IconClose,
  IconLayers,
  IconDownload,
  IconTrash,
  IconCheck,
  IconVideoCamera,
  IconPhoto,
} from '@/components/ui/Icons';

export type MediaTypeFilter = 'all' | 'video' | 'photo';

interface GooglePhotosTopBarProps {
  onToggleMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  mediaTypeFilter: MediaTypeFilter;
  onMediaTypeChange: (type: MediaTypeFilter) => void;
  // Selection Contextual Props
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddToAlbum: () => void;
  onBatchDownloadZip: () => void;
  onBatchDelete: () => void;
  isBatchProcessing?: boolean;
}

export function GooglePhotosTopBar({
  onToggleMobileMenu,
  searchQuery,
  onSearchChange,
  mediaTypeFilter,
  onMediaTypeChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onAddToAlbum,
  onBatchDownloadZip,
  onBatchDelete,
  isBatchProcessing = false,
}: GooglePhotosTopBarProps) {
  const isSelectionMode = selectedCount > 0;

  return (
    <header className="sticky top-0 z-30 w-full select-none">
      <AnimatePresence mode="wait">
        {isSelectionMode ? (
          /* Contextual Action Bar Mode (Studio Obsidian Style) */
          <motion.div
            key="selection-bar"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="w-full glass-panel bg-slate-900/95 text-white shadow-xl px-4 py-3 sm:px-6 flex items-center justify-between gap-3 border-b border-white/10 backdrop-blur-2xl"
          >
            {/* Left Counter & Deselect */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onDeselectAll}
                className="w-9 h-9 rounded-xl hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer" aria-label="Batal Memilih (Esc)" title="Batal Memilih (Esc)"
              >
                <IconClose className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black font-mono text-white">
                  {selectedCount}
                </span>
                <span className="text-xs sm:text-sm text-slate-300 font-medium hidden xs:inline">
                  item terpilih
                </span>
              </div>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Select All Toggle */}
              <button
                type="button"
                onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer hidden md:flex items-center gap-1.5"
              >
                <IconCheck className="w-3.5 h-3.5" />
                <span>{selectedCount === totalCount ? 'Batal Semua' : 'Pilih Semua'}</span>
              </button>

              {/* Add to Album */}
              <button
                type="button"
                onClick={onAddToAlbum}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50" aria-label="Tambah ke Album" title="Tambah ke Album"
              >
                <IconLayers className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah ke Album</span>
              </button>

              {/* Download ZIP */}
              <button
                type="button"
                onClick={onBatchDownloadZip}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50" aria-label="Unduh Batch sebagai ZIP" title="Unduh Batch sebagai ZIP"
              >
                <IconDownload className="w-4 h-4" />
                <span className="hidden sm:inline">Unduh ZIP</span>
              </button>

              {/* Delete from Vault */}
              <button
                type="button"
                onClick={onBatchDelete}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white active:scale-95 text-xs font-bold transition-all cursor-pointer disabled:opacity-50" aria-label="Hapus dari Vault" title="Hapus dari Vault"
              >
                <IconTrash className="w-4 h-4" />
                <span className="hidden md:inline">Hapus</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Normal Omnibar Mode (Clean, Centered, Studio Glassmorphism) */
          <motion.div
            key="normal-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full glass-panel bg-white/60 border-b border-white/50 backdrop-blur-xl px-4 py-3 sm:px-6 md:px-8 flex items-center justify-between gap-3 shadow-2xs"
          >
            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="w-9 h-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-white/60 flex items-center justify-center lg:hidden shrink-0 cursor-pointer shadow-2xs" aria-label="Buka Menu" title="Buka Menu"
            >
              <IconMenu className="w-5 h-5" />
            </button>

            {/* Google Photos Signature Centered Omnibar with Integrated Media Switcher */}
            <div className="relative flex-1 max-w-3xl mx-auto flex items-center gap-3">
              {/* Search Bar Input Frame */}
              <div className="relative flex-1 flex items-center">
                <IconSearch className="absolute left-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search media"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Cari foto, kreator (@username), caption..."
                  className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white/70 hover:bg-white/90 focus:bg-white border border-white/80 focus:border-indigo-500/40 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/15 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <IconClose className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Integrated Media Type Filter Island (All / Video / Photo) */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-white/70 border border-white/80 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => onMediaTypeChange('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => onMediaTypeChange('video')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === 'video'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <IconVideoCamera className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMediaTypeChange('photo')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === 'photo'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <IconPhoto className="w-3.5 h-3.5" />
                  <span>Foto</span>
                </button>
              </div>
            </div>

            {/* Empty Spacer on Desktop for Perfect Symmetry */}
            <div className="hidden lg:block w-9 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
