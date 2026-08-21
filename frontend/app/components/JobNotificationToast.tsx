'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCheckCircle,
  IconClose,
  IconFolder,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
} from './Icons';

export interface CompletedJobNotice {
  id: number;
  platform: string;
  url: string;
  username?: string;
  caption?: string;
  filesCount?: number;
  thumbnailUrl?: string;
}

interface JobNotificationToastProps {
  notice: CompletedJobNotice | null;
  onClose: () => void;
  autoDismissMs?: number;
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <IconInstagram className="w-3.5 h-3.5 text-pink-400" />;
    case 'tiktok':
      return <IconTikTok className="w-3.5 h-3.5 text-cyan-400" />;
    case 'threads':
      return <IconThreads className="w-3.5 h-3.5 text-slate-200" />;
    case 'youtube':
      return <IconYouTube className="w-3.5 h-3.5 text-red-400" />;
    case 'x':
    case 'twitter':
      return <IconX className="w-3.5 h-3.5 text-sky-400" />;
    case 'reddit':
      return <IconReddit className="w-3.5 h-3.5 text-orange-400" />;
    case 'pinterest':
      return <IconPinterest className="w-3.5 h-3.5 text-red-500" />;
    default:
      return <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  }
}

export function JobNotificationToast({
  notice,
  onClose,
  autoDismissMs = 6000,
}: JobNotificationToastProps) {
  // Auto-dismiss timer
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [notice, autoDismissMs, onClose]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-[22px] bg-slate-900/95 backdrop-blur-xl text-white border border-slate-700/80 shadow-2xl flex flex-col gap-3.5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Symmetrical Squircle Icon Badge */}
              <div className="w-9 h-9 rounded-[8px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <IconCheckCircle className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 font-mono">
                    Download Complete
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <div className="flex items-center gap-1">
                    {getPlatformIcon(notice.platform)}
                    <span className="text-[10px] font-semibold text-slate-300 capitalize">
                      {notice.platform}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-100 truncate mt-0.5">
                  {notice.username ? `@${notice.username}` : 'Media archived to Vault'}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Caption preview if available */}
          {notice.caption && (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-800/70 p-2.5 rounded-[10px] border border-slate-700/40">
              {notice.caption}
            </p>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400">
              Ready in local vault
            </span>

            <Link
              href="/vault"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-md"
            >
              <IconFolder className="w-3.5 h-3.5" />
              <span>Open in Vault</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
