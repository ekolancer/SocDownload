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
  autoDismissMs = 3000,
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
  }, [notice?.id, autoDismissMs]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCloseRef.current();
    }, 250);
  };

  return (
    <AnimatePresence>
      {isVisible && notice && (
        <motion.div
          key={`toast-${notice.id}`}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="fixed bottom-6 right-6 z-50 max-w-xs sm:max-w-sm w-full p-3.5 rounded-[18px] bg-white border border-indigo-100 shadow-[0_16px_36px_rgba(15,23,42,0.12),0_4px_12px_rgba(79,70,229,0.08)] flex flex-col gap-2.5 overflow-hidden select-none"
        >
          {/* Main Compact Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Symmetrical Squircle Primary Icon Badge */}
              <div className="w-8 h-8 rounded-[10px] bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 aspect-square shadow-2xs">
                <IconCheckCircle className="w-4 h-4 text-indigo-600" />
              </div>

              {/* Title & Platform */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 font-mono">
                    Downloaded
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1">
                    {getPlatformIcon(notice.platform)}
                    <span className="text-[10px] font-bold text-slate-500 capitalize">
                      {notice.platform}
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-black text-slate-900 truncate mt-0.5">
                  {notice.username ? `@${notice.username}` : 'Saved to vault'}
                </h4>
              </div>
            </div>

            {/* Symmetrical 1:1 Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-6 h-6 rounded-[6px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer"
              title="Dismiss"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Linear Countdown Progress Bar in Primary Palette */}
          <div className="w-full h-1 bg-indigo-50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoDismissMs / 1000, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
