'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCheckCircle, IconClose, IconFolder, IconSparkles } from './Icons';

export interface CompletedJobNotice {
  id: number;
  platform: string;
  url: string;
  username?: string;
  caption?: string;
  filesCount?: number;
}

interface JobNotificationToastProps {
  notice: CompletedJobNotice | null;
  onClose: () => void;
}

export function JobNotificationToast({ notice, onClose }: JobNotificationToastProps) {
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-3xl bg-slate-900 text-white m3-elevation-4 border border-slate-700/60 shadow-2xl flex flex-col gap-3"
        >
          {/* Header & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
                <IconCheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 font-mono">
                  Download Complete
                </span>
                <h4 className="text-sm font-bold text-slate-100">
                  {notice.username ? `@${notice.username}` : notice.platform}
                </h4>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Caption Snippet */}
          {notice.caption && (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
              {notice.caption}
            </p>
          )}

          {/* Actions: View in Vault Button */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <Link
              href="/vault"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 transition-all"
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
