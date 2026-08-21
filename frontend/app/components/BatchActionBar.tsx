'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconStar,
  IconFolderPlus,
  IconDownload,
  IconTrash,
} from './Icons';

interface BatchActionBarProps {
  selectedIds: number[];
  onDeselectAll: () => void;
  onAddToAlbum: () => void;
  onToggleFavoriteBatch: () => void;
  onDownloadZipBatch: () => void;
  onDeleteBatch: () => void;
  isProcessing?: boolean;
}

export function BatchActionBar({
  selectedIds,
  onDeselectAll,
  onAddToAlbum,
  onToggleFavoriteBatch,
  onDownloadZipBatch,
  onDeleteBatch,
  isProcessing = false,
}: BatchActionBarProps) {
  const count = selectedIds.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[94vw] sm:w-auto p-2 sm:p-2.5 rounded-[18px] bg-slate-900/95 backdrop-blur-xl text-white border border-slate-700/80 shadow-2xl flex items-center justify-between sm:justify-center gap-2 sm:gap-4"
        >
          {/* Selected Count & Dismiss */}
          <div className="flex items-center gap-2 px-2 shrink-0">
            <button
              type="button"
              onClick={onDeselectAll}
              className="w-6 h-6 rounded-[6px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Deselect All"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="min-w-[20px] h-5 px-1 rounded-[5px] bg-indigo-500 text-white text-xs font-mono font-bold flex items-center justify-center">
                {count}
              </span>
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">
                Selected
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700/80 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Add to Album */}
            <button
              type="button"
              onClick={onAddToAlbum}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <IconFolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Add to Album</span>
            </button>

            {/* Favorite Batch */}
            <button
              type="button"
              onClick={onToggleFavoriteBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <IconStar className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Favorite ⭐</span>
            </button>

            {/* Download ZIP */}
            <button
              type="button"
              onClick={onDownloadZipBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <IconDownload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export ZIP</span>
            </button>

            {/* Delete Batch */}
            <button
              type="button"
              onClick={onDeleteBatch}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/80 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
