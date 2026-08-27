'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconExternalLink,
  IconCheckCircle,
  IconTrash,
} from '@/components/ui/Icons';

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
  onSelectCreator?: (username: string, platform?: string) => void;
}

export function MediaLightboxModal({ item, onClose, onDelete, onSelectCreator }: MediaLightboxModalProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset file index when opening a new item
  useEffect(() => {
    setActiveFileIndex(0);
    setCopiedLink(false);
  }, [item?.id]);

  // Esc and arrow keys listener
  useEffect(() => {
    if (!item) return;
    closeButtonRef.current?.focus();
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
  const fileUrl = currentFile ? `/media-file/${currentFile.id}` : '';

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

  const handleCreatorClick = () => {
    if (item.username && onSelectCreator) {
      onSelectCreator(item.username, item.platform);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden" role="dialog" aria-modal="true" aria-label="Media preview">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 max-w-[95vw] max-h-[90vh] flex flex-col md:flex-row rounded-3xl bg-slate-900/95 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-2xl cursor-default"
        >
          {/* Close Button Top Right */}
          <button
            type="button"
             ref={closeButtonRef}
             onClick={onClose}
            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 shadow-md backdrop-blur-sm flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer"
            aria-label="Close Modal"
            title="Close Modal"
          >
            <IconClose className="w-4 h-4" />
          </button>

          {/* Left Side: Compact Media Preview Canvas */}
          <div className="relative flex items-center justify-center bg-slate-950 p-2 sm:p-3 overflow-hidden select-none min-w-[260px] md:min-w-[320px] max-h-[60vh] md:max-h-[85vh]">
            {fileUrl ? (
              isVideo ? (
                <video
                  src={fileUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[55vh] md:max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-lg border border-white/5"
                />
              ) : (
                <img
                  src={fileUrl}
                  alt={item.caption || 'Media Preview'}
                  className="max-h-[55vh] md:max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-lg border border-white/5"
                />
              )
            ) : (
              <div className="text-slate-500 font-mono text-sm p-6 text-center">
                No direct preview available
              </div>
            )}

            {/* Carousel Navigation Arrows */}
            {item.files.length > 1 && (
              <>
                {activeFileIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFileIndex((prev) => prev - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-sm border border-white/10 shadow-md flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer"
                    title="Previous item"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {activeFileIndex < item.files.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveFileIndex((prev) => prev + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-sm border border-white/10 shadow-md flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer"
                    title="Next item"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Indicator Pill */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md text-white text-xs font-mono font-bold shadow-md">
                  {activeFileIndex + 1} / {item.files.length}
                </div>
              </>
            )}
          </div>

          {/* Right Side: Metadata Sidebar & Actions */}
          <div className="w-full md:w-72 lg:w-80 p-5 sm:p-6 flex flex-col justify-between gap-5 overflow-y-auto bg-slate-950/80 border-t md:border-t-0 md:border-l border-white/[0.08] shrink-0">
            <div className="flex flex-col gap-3">
              {/* Header: Platform & Username */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono shrink-0">
                  {item.platform}
                </span>
                {item.username ? (
                  <button
                    type="button"
                    onClick={handleCreatorClick}
                    className="font-bold text-sm text-white hover:text-emerald-400 truncate transition-colors text-left cursor-pointer group flex items-center gap-1"
                    title={`Filter vault by @${item.username}`}
                    aria-label={`Filter vault by @${item.username}`}
                  >
                    <span>@{item.username}</span>
                    <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                  </button>
                ) : (
                  <span className="font-bold text-sm text-white truncate">
                    Archived Media
                  </span>
                )}
              </div>

              {/* Date */}
              <div className="text-[11px] font-mono text-slate-400">
                Archived on {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </div>

              {/* Caption */}
              {item.caption && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-wrap max-h-48 overflow-y-auto shadow-2xs">
                  {item.caption}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.08]">
              {/* Copy Source Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer shadow-2xs"
              >
                {copiedLink ? (
                  <>
                    <IconCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <IconExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Copy Source URL</span>
                  </>
                )}
              </button>

              {/* Download File */}
              {fileUrl && (
                <a
                  href={fileUrl}
                  download
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 transition-all text-center shadow-md shadow-white/10 cursor-pointer"
                >
                  <IconDownload className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Save to Device</span>
                </a>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-600 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
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
