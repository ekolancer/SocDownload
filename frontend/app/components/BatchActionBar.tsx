'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        className="pointer-events-auto flex items-center justify-between gap-3 p-3 sm:p-4 rounded-[2rem] bg-[#EEF2F7]/95 backdrop-blur-xl shadow-[12px_12px_32px_#cbd5e1,-12px_-12px_32px_#ffffff] border border-white/90"
      >
        {/* Left: Selected Count & Deselect Button */}
        <div className="flex items-center gap-2.5 pl-2">
          <button
            onClick={onDeselectAll}
            className="p-1.5 rounded-xl bg-[#E5EBF2] shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff] text-slate-500 hover:text-slate-900 transition-colors"
            title="Deselect all"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-indigo-600 font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-extrabold text-slate-700 hidden sm:inline">
              Selected
            </span>
          </div>
        </div>

        {/* Right: Actions Suite */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add to Album */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddToAlbum}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer disabled:opacity-50"
            title="Add to Album"
          >
            <IconFolderPlus className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Add to Album</span>
          </motion.button>

          {/* Toggle Favorite */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFavoriteBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-amber-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer disabled:opacity-50"
            title="Toggle Favorite"
          >
            <IconStarFilled className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Star</span>
          </motion.button>

          {/* Download ZIP */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDownloadZipBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer disabled:opacity-50"
            title="Download ZIP archive"
          >
            <IconDownload className="w-4 h-4 text-indigo-500" />
            <span className="hidden md:inline">Download ZIP</span>
          </motion.button>

          {/* Batch Delete */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDeleteBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Batch delete from vault & disk"
          >
            <IconTrash className="w-4 h-4 text-rose-500" />
            <span>Delete</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
