'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCheckCircle,
  IconClose,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconSparkles,
  IconAlertCircle,
  IconBookmark,
} from '@/components/ui/Icons';

export interface CompletedJobNotice {
  id: number;
  platform: string;
  url: string;
  status: 'done' | 'dup' | 'failed';
  error?: string | null;
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
      return <IconInstagram className="w-3.5 h-3.5 text-pink-600" />;
    case 'tiktok':
      return <IconTikTok className="w-3.5 h-3.5 text-slate-900" />;
    case 'threads':
      return <IconThreads className="w-3.5 h-3.5 text-slate-900" />;
    case 'youtube':
      return <IconYouTube className="w-3.5 h-3.5 text-red-600" />;
    case 'x':
    case 'twitter':
      return <IconX className="w-3.5 h-3.5 text-slate-900" />;
    case 'reddit':
      return <IconReddit className="w-3.5 h-3.5 text-orange-600" />;
    case 'pinterest':
      return <IconPinterest className="w-3.5 h-3.5 text-red-600" />;
    default:
      return <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />;
  }
}

export function JobNotificationToast({
  notice,
  onClose,
  autoDismissMs = 3500,
}: JobNotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Trigger toast visibility & reliable auto-dismiss timer keyed on notice.id
  useEffect(() => {
    if (!notice) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onCloseRef.current();
      }, 300);
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [notice?.id, notice?.status, autoDismissMs]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCloseRef.current();
    }, 250);
  };

  if (!notice) return null;

  const isDone = notice.status === 'done';
  const isDup = notice.status === 'dup';
  const isFailed = notice.status === 'failed';

  // Visual Theme Configuration based on Status
  const statusTheme = isDone
    ? {
        label: 'Downloaded',
        subtext: notice.username ? `@${notice.username} • Saved to vault` : 'Media successfully saved to vault',
        icon: <IconCheckCircle className="w-4 h-4 text-emerald-600" />,
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        cardBg: 'bg-white/95 border-emerald-100 shadow-[0_16px_36px_rgba(16,185,129,0.12),0_4px_12px_rgba(15,23,42,0.06)]',
        timerBg: 'from-emerald-500 to-teal-400',
        trackBg: 'bg-emerald-50',
      }
    : isDup
    ? {
        label: 'Di-skip (Duplikat)',
        subtext: 'Media sudah ada di vault (Dilewati)',
        icon: <IconBookmark className="w-4 h-4 text-amber-600" />,
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
        cardBg: 'bg-white/95 border-amber-100 shadow-[0_16px_36px_rgba(245,158,11,0.12),0_4px_12px_rgba(15,23,42,0.06)]',
        timerBg: 'from-amber-500 to-yellow-400',
        trackBg: 'bg-amber-50',
      }
    : {
        label: 'Gagal Download',
        subtext: notice.error ? `Error: ${notice.error}` : 'Gagal mengunduh media dari URL',
        icon: <IconAlertCircle className="w-4 h-4 text-rose-600" />,
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
        cardBg: 'bg-white/95 border-rose-100 shadow-[0_16px_36px_rgba(244,63,94,0.12),0_4px_12px_rgba(15,23,42,0.06)]',
        timerBg: 'from-rose-500 to-pink-500',
        trackBg: 'bg-rose-50',
      };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`toast-${notice.id}-${notice.status}`}
          initial={{ opacity: 0, y: 28, scale: 0.94, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 20, scale: 0.94, filter: 'blur(6px)' }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className={`fixed bottom-6 right-6 z-50 max-w-xs sm:max-w-sm w-full p-3.5 rounded-2xl border backdrop-blur-xl flex flex-col gap-2.5 overflow-hidden select-none ${statusTheme.cardBg}`}
        >
          {/* Main Content Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              
              {/* Symmetrical Status Icon Badge */}
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 aspect-square shadow-2xs ${statusTheme.badgeBg}`}>
                {statusTheme.icon}
              </div>

              {/* Title, Platform & Subtext */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider font-mono px-1.5 py-0.2 rounded border ${statusTheme.badgeBg}`}>
                    {statusTheme.label}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1">
                    {getPlatformIcon(notice.platform)}
                    <span className="text-[10px] font-bold text-slate-500 capitalize">
                      {notice.platform}
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5" title={notice.url}>
                  {statusTheme.subtext}
                </h4>
              </div>
            </div>

            {/* Symmetrical 1:1 Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-6 h-6 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer" aria-label="Dismiss" title="Dismiss"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Linear Countdown Progress Bar */}
          <div className={`w-full h-1 rounded-full overflow-hidden ${statusTheme.trackBg}`}>
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoDismissMs / 1000, ease: 'linear' }}
              className={`h-full bg-gradient-to-r rounded-full ${statusTheme.timerBg}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
