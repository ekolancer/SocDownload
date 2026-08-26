'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconStar,
  IconFolderPlus,
  IconFolderMinus,
  IconDownload,
  IconFileText,
  IconTrash,
} from '@/components/ui/Icons';

interface BatchActionBarProps {
  selectedIds: number[];
  onDeselectAll: () => void;
  onAddToAlbum: () => void;
  onRemoveFromAlbum?: () => void;
  onToggleFavoriteBatch: () => void;
  onDownloadZipBatch: () => void;
  onDownloadCsvBatch?: () => void;
  onDeleteBatch: () => void;
  isProcessing?: boolean;
}

export function BatchActionBar({
  selectedIds,
  onDeselectAll,
  onAddToAlbum,
  onRemoveFromAlbum,
  onToggleFavoriteBatch,
  onDownloadZipBatch,
  onDownloadCsvBatch,
  onDeleteBatch,
  isProcessing = false,
}: BatchActionBarProps) {
  const count = selectedIds.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94vw] sm:w-auto p-2 sm:p-2.5 rounded-[20px] bg-white text-slate-900 border border-indigo-100 shadow-[0_20px_50px_rgba(15,23,42,0.14),0_6px_16px_rgba(79,70,229,0.08)] flex items-center justify-between sm:justify-center gap-2 sm:gap-3 select-none"
        >
          {/* Selected Count & Dismiss Pill */}
          <div className="flex items-center gap-2 px-1.5 shrink-0">
            <button
              type="button"
              onClick={onDeselectAll}
              className="w-6 h-6 rounded-[7px] bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Deselect All"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="min-w-[20px] h-5 px-1.5 rounded-[6px] bg-indigo-600 text-white text-xs font-mono font-black flex items-center justify-center shadow-2xs">
                {count}
              </span>
              <span className="text-xs font-black text-slate-800 hidden sm:inline">
                Selected
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200/90 hidden sm:block shrink-0" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Add to Album */}
            <button
              type="button"
              onClick={onAddToAlbum}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-slate-700 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <IconFolderPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Album</span>
            </button>

            {/* Remove from Album (Shown when viewing an album) */}
            {onRemoveFromAlbum && (
              <button
                type="button"
                onClick={onRemoveFromAlbum}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Remove selected items from this album"
              >
                <IconFolderMinus className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            )}

            {/* Favorite Batch */}
            <button
              type="button"
              onClick={onToggleFavoriteBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-slate-700 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 border border-slate-200/80 hover:border-amber-200 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <IconStar className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Star</span>
            </button>

            {/* Download ZIP (Primary Action) */}
            <button
              type="button"
              onClick={onDownloadZipBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              title="Download selected media as ZIP package"
            >
              <IconDownload className="w-3.5 h-3.5 text-white" />
              <span>ZIP</span>
            </button>

            {/* Export CSV */}
            {onDownloadCsvBatch && (
              <button
                type="button"
                onClick={onDownloadCsvBatch}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-slate-700 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 border border-slate-200/80 hover:border-sky-200 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Export selected metadata as CSV"
              >
                <IconFileText className="w-3.5 h-3.5 text-sky-600" />
                <span>CSV</span>
              </button>
            )}

            {/* Delete Batch */}
            <button
              type="button"
              onClick={onDeleteBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200/80 hover:border-rose-600 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <IconTrash className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
