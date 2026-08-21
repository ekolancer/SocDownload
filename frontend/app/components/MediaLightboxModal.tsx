'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconExternalLink,
  IconCheckCircle,
  IconTrash,
} from './Icons';

export interface MediaFile {
  id: number;
  kind: 'image' | 'video';
  url: string;
  name: string;
  path?: string;
}

export interface MediaItem {
  id: number;
  platform: string;
  source_url: string;
  username: string | null;
  caption: string | null;
  is_favorite?: boolean;
  posted_at: string | null;
  created_at: string | null;
  hashtags?: string | null;
  files: MediaFile[];
}

interface MediaLightboxModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onDelete?: (id: number) => Promise<void>;
}

export function MediaLightboxModal({ item, onClose, onDelete }: MediaLightboxModalProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset file index when opening a new item
  useEffect(() => {
    setActiveFileIndex(0);
    setCopiedLink(false);
  }, [item?.id]);

  // Esc and arrow keys listener
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && activeFileIndex < item.files.length - 1) {
        setActiveFileIndex((prev) => prev + 1);
      }
      if (e.key === 'ArrowLeft' && activeFileIndex > 0) {
        setActiveFileIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, activeFileIndex, onClose]);

  if (!item) return null;

  const currentFile = item.files?.[activeFileIndex];
  const isVideo = currentFile?.kind === 'video' || Boolean(currentFile?.path?.endsWith('.mp4'));
  const fileUrl = currentFile ? `/api/media/files/${currentFile.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.source_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    if (confirm('Hapus media ini secara permanen dari vault dan harddisk?')) {
      setDeleting(true);
      try {
        await onDelete(item.id);
        onClose();
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        
        {/* Backdrop: Clicking outside triggers onClose */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row rounded-[24px] bg-white border border-slate-200 overflow-hidden shadow-2xl cursor-default"
        >
          {/* Close Button Top Right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white/90 hover:bg-slate-100 text-slate-700 shadow-md transition-all cursor-pointer"
            title="Close Modal"
          >
            <IconClose className="w-4 h-4" />
          </button>

          {/* Left Side: Media Preview Canvas */}
          <div className="flex-1 relative flex items-center justify-center bg-slate-900 p-4 sm:p-6 min-h-[280px] md:min-h-[460px] overflow-hidden">
            {fileUrl ? (
              isVideo ? (
                <video
                  src={fileUrl}
                  controls
                  autoPlay
                  className="max-h-[65vh] w-auto max-w-full rounded-xl shadow-xl object-contain"
                />
              ) : (
                <img
                  src={fileUrl}
                  alt={item.caption || 'Media Preview'}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-xl"
                />
              )
            ) : (
              <div className="text-slate-400 font-mono text-sm p-6 text-center">
                No direct preview available
              </div>
            )}

            {/* Carousel Arrows */}
            {item.files.length > 1 && (
              <>
                {activeFileIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFileIndex((prev) => prev - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-all cursor-pointer"
                    title="Previous item"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {activeFileIndex < item.files.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveFileIndex((prev) => prev + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-all cursor-pointer"
                    title="Next item"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Indicator Pill */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-mono font-bold">
                  {activeFileIndex + 1} / {item.files.length}
                </div>
              </>
            )}
          </div>

          {/* Right Side: Metadata & Actions */}
          <div className="w-full md:w-80 p-5 sm:p-6 flex flex-col justify-between gap-5 overflow-y-auto bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
            
            <div className="flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                  {item.platform}
                </span>
                <span className="font-extrabold text-sm text-slate-900 truncate">
                  {item.username ? `@${item.username}` : 'Archived Media'}
                </span>
              </div>

              {/* Date */}
              <div className="text-[11px] font-mono text-slate-400">
                Archived on {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
              </div>

              {/* Caption */}
              {item.caption && (
                <div className="p-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap max-h-44 overflow-y-auto">
                  {item.caption}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-200">
              {/* Copy Source Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-full text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <IconExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Copy Source URL</span>
                  </>
                )}
              </button>

              {/* Download File */}
              {fileUrl && (
                <a
                  href={fileUrl}
                  download
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all text-center"
                >
                  <IconDownload className="w-4 h-4 text-white shrink-0" />
                  <span>Save to Device</span>
                </a>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  <IconTrash className={`w-4 h-4 shrink-0 ${deleting ? 'animate-spin' : ''}`} />
                  <span>{deleting ? 'Deleting...' : 'Delete from Vault'}</span>
                </button>
              )}
            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
