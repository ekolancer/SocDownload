'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconStar,
  IconFolderPlus,
  IconFolderMinus,
  IconDownload,
  IconTrash,
  IconCheck,
} from '@/components/ui/Icons';

interface BatchActionBarProps {
  selectedIds: number[];
  totalCount?: number;
  onSelectAll?: () => void;
  onDeselectAll: () => void;
  onAddToAlbum: () => void;
  onRemoveFromAlbum?: () => void;
  onToggleFavoriteBatch: () => void;
  onDownloadZipBatch: () => void;
  onDeleteBatch: () => void;
  isProcessing?: boolean;
}

export function BatchActionBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onAddToAlbum,
  onRemoveFromAlbum,
  onToggleFavoriteBatch,
  onDownloadZipBatch,
  onDeleteBatch,
  isProcessing = false,
}: BatchActionBarProps) {
  const count = selectedIds.length;
  const isAllSelected = totalCount !== undefined && totalCount > 0 && count === totalCount;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[94vw] sm:w-auto p-1.5 rounded-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] flex items-center justify-between sm:justify-center gap-2 select-none ring-1 ring-black/40"
        >
          {/* Selected Count & Dismiss Pill */}
          <div className="flex items-center gap-2 pl-2 pr-1 shrink-0">
            <button
              type="button"
              onClick={onDeselectAll}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 border border-white/10"
              title="Batal Memilih (Esc)"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="min-w-[22px] h-5.5 px-2 rounded-full bg-emerald-500 text-black text-xs font-mono font-bold flex items-center justify-center shadow-xs">
                {count}
              </span>
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">
                Terpilih
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block shrink-0" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pr-1">
            {/* Select All Toggle */}
            {onSelectAll && totalCount !== undefined && totalCount > 0 && (
              <button
                type="button"
                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                <IconCheck className="w-3.5 h-3.5" />
                <span>{isAllSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
              </button>
            )}

            {/* Add to Album */}
            <button
              type="button"
              onClick={onAddToAlbum}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 active:scale-95 transition-all shadow-md shadow-white/10 disabled:opacity-50 cursor-pointer"
            >
              <IconFolderPlus className="w-3.5 h-3.5 text-slate-950" />
              <span>Album</span>
            </button>

            {/* Remove from Album (Shown when viewing an album) */}
            {onRemoveFromAlbum && (
              <button
                type="button"
                onClick={onRemoveFromAlbum}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 hover:text-amber-100 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                title="Hapus item dari album ini"
              >
                <IconFolderMinus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluarkan</span>
              </button>
            )}

            {/* Favorite Batch */}
            <button
              type="button"
              onClick={onToggleFavoriteBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 hover:text-amber-200 bg-slate-800/80 hover:bg-slate-700 border border-white/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="Beri tanda bintang"
            >
              <IconStar className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="hidden md:inline">Favorit</span>
            </button>

            {/* Download ZIP Batch */}
            <button
              type="button"
              onClick={onDownloadZipBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-white/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="Unduh semua item terpilih dalam ZIP"
            >
              <IconDownload className="w-3.5 h-3.5 text-emerald-400" />
              <span>ZIP</span>
            </button>

            {/* Delete Batch */}
            <button
              type="button"
              onClick={onDeleteBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-600 border border-rose-500/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="Hapus permanen dari Vault"
            >
              <IconTrash className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Hapus</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
