'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  IconFolderPlus,
  IconStarFilled,
  IconDownload,
  IconTrash,
  IconClose,
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
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-2xl pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="pointer-events-auto flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-full bg-white/95 backdrop-blur-xl m3-elevation-4 border border-slate-200/90 shadow-2xl"
      >
        {/* Left: Selected Count & Deselect Button */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={onDeselectAll}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Deselect all"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-indigo-600 font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">
              Selected
            </span>
          </div>
        </div>

        {/* Right: Actions Suite */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Add to Album */}
          <button
            onClick={onAddToAlbum}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
            title="Add to Album"
          >
            <IconFolderPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Add to Album</span>
          </button>

          {/* Toggle Favorite */}
          <button
            onClick={onToggleFavoriteBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 transition-all cursor-pointer disabled:opacity-50"
            title="Toggle Favorite"
          >
            <IconStarFilled className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Star</span>
          </button>

          {/* Download ZIP */}
          <button
            onClick={onDownloadZipBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 transition-all cursor-pointer disabled:opacity-50"
            title="Download ZIP archive"
          >
            <IconDownload className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">ZIP</span>
          </button>

          {/* Batch Delete */}
          <button
            onClick={onDeleteBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 m3-elevation-1 transition-all cursor-pointer disabled:opacity-50"
            title="Batch delete from vault & disk"
          >
            <IconTrash className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
