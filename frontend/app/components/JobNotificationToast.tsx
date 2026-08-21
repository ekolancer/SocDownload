'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCheckCircle,
  IconAlertCircle,
  IconClose,
  IconLayers,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
} from './Icons';

export interface JobNotification {
  id: number;
  platform: string;
  url: string;
  status: 'done' | 'failed' | 'dup';
  error?: string;
  title?: string;
  username?: string;
}

interface JobNotificationToastProps {
  notification: JobNotification | null;
  onDismiss: () => void;
}

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p === 'instagram') return <IconInstagram className="w-4 h-4 text-pink-600" />;
  if (p === 'tiktok') return <IconTikTok className="w-4 h-4 text-teal-600" />;
  if (p === 'threads') return <IconThreads className="w-4 h-4 text-slate-800" />;
  if (p === 'x') return <IconX className="w-4 h-4 text-slate-800" />;
  if (p === 'youtube') return <IconYouTube className="w-4 h-4 text-red-600" />;
  if (p === 'reddit') return <IconReddit className="w-4 h-4 text-orange-600" />;
  if (p === 'pinterest') return <IconPinterest className="w-4 h-4 text-red-600" />;
  return <IconLayers className="w-4 h-4 text-indigo-600" />;
}

export function JobNotificationToast({ notification, onDismiss }: JobNotificationToastProps) {
  useEffect(() => {
    if (!notification) return;
    // Auto-dismiss after 6.5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 6500);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const isSuccess = notification?.status === 'done';
  const isDup = notification?.status === 'dup';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 pointer-events-none">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
            className="pointer-events-auto rounded-[2rem] bg-[#EEF2F7] shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90 p-5 flex flex-col gap-3.5"
          >
            {/* Top Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] ${
                    isSuccess
                      ? 'bg-emerald-50 text-emerald-600'
                      : isDup
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {isSuccess ? (
                    <IconCheckCircle className="w-5 h-5 animate-pulse" />
                  ) : isDup ? (
                    <IconLayers className="w-5 h-5" />
                  ) : (
                    <IconAlertCircle className="w-5 h-5" />
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide font-mono text-slate-800">
                      {isSuccess
                        ? 'Download Complete!'
                        : isDup
                        ? 'Already in Vault'
                        : 'Download Failed'}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E5EBF2] text-slate-700">
                      {getPlatformIcon(notification.platform)}
                      <span className="capitalize">{notification.platform}</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Job #{notification.id}
                  </span>
                </div>
              </div>

              <button
                onClick={onDismiss}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#E5EBF2] transition-colors"
                title="Dismiss"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Content Preview / Error info with relaxed leading */}
            <div className="p-3.5 rounded-xl bg-[#E5EBF2] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] text-xs text-slate-700 font-medium break-all leading-relaxed">
              {notification.error ? (
                <span className="text-rose-600 font-mono text-xs">{notification.error}</span>
              ) : (
                <span className="line-clamp-2">{notification.url}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              {isSuccess && (
                <Link
                  href="/vault"
                  onClick={onDismiss}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 shadow-[3px_3px_8px_rgba(79,70,229,0.35),-2px_-2px_5px_#ffffff] hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <IconLayers className="w-3.5 h-3.5" />
                  <span>View in Media Vault</span>
                </Link>
              )}

              <button
                type="button"
                onClick={onDismiss}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-slate-900 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all"
              >
                Close
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
