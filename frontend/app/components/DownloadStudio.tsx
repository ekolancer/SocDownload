'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconDownload,
  IconSparkles,
  IconPaste,
  IconAlertCircle,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
} from './Icons';

interface DownloadStudioProps {
  onDownload: (url: string) => Promise<boolean>;
  submitting: boolean;
  submitError: string;
  onClearError: () => void;
  activeJobStatus?: 'queued' | 'running' | 'done' | 'failed' | null;
}

export type PlatformType =
  | 'instagram'
  | 'threads'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'pinterest'
  | 'unknown';

export function detectPlatform(url: string): PlatformType {
  try {
    const raw = url.trim();
    if (!raw) return 'unknown';
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('instagram.com') || host.includes('instagr.am')) return 'instagram';
    if (host.includes('threads.net')) return 'threads';
    if (host.includes('x.com') || host.includes('twitter.com') || host.includes('t.co')) return 'x';
    if (host.includes('tiktok.com') || host.includes('vm.tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('reddit.com') || host.includes('redd.it')) return 'reddit';
    if (host.includes('pinterest.com') || host.includes('pin.it')) return 'pinterest';
  } catch {
    // ignore
  }
  return 'unknown';
}

const PLATFORM_CONFIG: Record<
  PlatformType,
  { name: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  instagram: {
    name: 'Instagram',
    color: '#E1306C',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    icon: <IconInstagram className="w-4 h-4 text-[#E1306C]" />,
  },
  threads: {
    name: 'Threads',
    color: '#0F172A',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    icon: <IconThreads className="w-4 h-4 text-slate-900" />,
  },
  x: {
    name: 'X (Twitter)',
    color: '#0F172A',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    icon: <IconX className="w-4 h-4 text-slate-900" />,
  },
  tiktok: {
    name: 'TikTok',
    color: '#0F172A',
    bg: '#F0FDFA',
    border: '#99F6E4',
    icon: <IconTikTok className="w-4 h-4 text-[#00F2FE]" />,
  },
  youtube: {
    name: 'YouTube',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: <IconYouTube className="w-4 h-4 text-[#EF4444]" />,
  },
  reddit: {
    name: 'Reddit',
    color: '#FF4500',
    bg: '#FFF7ED',
    border: '#FED7AA',
    icon: <IconReddit className="w-4 h-4 text-[#FF4500]" />,
  },
  pinterest: {
    name: 'Pinterest',
    color: '#E60023',
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: <IconPinterest className="w-4 h-4 text-[#E60023]" />,
  },
  unknown: {
    name: 'Auto Detect',
    color: '#64748B',
    bg: '#F1F5F9',
    border: '#E2E8F0',
    icon: <IconSparkles className="w-4 h-4 text-slate-500" />,
  },
};

export function DownloadStudio({
  onDownload,
  submitting,
  submitError,
  onClearError,
  activeJobStatus,
}: DownloadStudioProps) {
  const [url, setUrl] = useState('');
  const [detected, setDetected] = useState<PlatformType>('unknown');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStep, setProgressStep] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect platform as user types
  useEffect(() => {
    setDetected(detectPlatform(url));
    if (submitError) onClearError();
  }, [url]);

  // Global "/" keyboard shortcut to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real-time progress simulator and job tracker
  useEffect(() => {
    if (submitting || activeJobStatus === 'running' || activeJobStatus === 'queued') {
      setProgressPercent(15);
      setProgressStep('Validating and enqueuing link...');

      let current = 15;
      progressTimerRef.current = setInterval(() => {
        current += Math.floor(Math.random() * 8) + 4;
        if (current >= 92) {
          current = 92;
          setProgressStep('Finalizing streams & archiving to vault...');
        } else if (current >= 65) {
          setProgressStep('Downloading high-resolution media streams...');
        } else if (current >= 35) {
          setProgressStep('Resolving platform metadata & author credentials...');
        }
        setProgressPercent(current);
      }, 400);
    } else if (activeJobStatus === 'done') {
      setProgressPercent(100);
      setProgressStep('Complete! Saved to Media Vault.');
      const t = setTimeout(() => {
        setProgressPercent(0);
        setProgressStep('');
      }, 3500);
      return () => clearTimeout(t);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (progressPercent > 0 && progressPercent < 100) {
        setProgressPercent(0);
        setProgressStep('');
      }
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [submitting, activeJobStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || submitting) return;

    const success = await onDownload(url.trim());
    if (success) {
      setUrl('');
      setDetected('unknown');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const currentConfig = PLATFORM_CONFIG[detected];
  const isProgressActive = submitting || (progressPercent > 0 && progressPercent <= 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className="relative w-full"
    >
      {/* Outer Double-Bezel Hardware Enclosure (Neumorphic Card) */}
      <div className="rounded-[2.4rem] bg-[#EEF2F7] shadow-[14px_14px_32px_#cbd5e1,-14px_-14px_32px_#ffffff] p-4 sm:p-6 border border-white/80 transition-all duration-300">
        
        {/* Inner Concentric Core */}
        <div className="rounded-[calc(2.4rem-0.75rem)] bg-[#F4F7FB] border border-white/90 p-6 sm:p-10 shadow-[inset_2px_2px_6px_#e2e8f0,inset_-2px_-2px_6px_#ffffff] flex flex-col gap-8">
          
          {/* Header Eyebrow & Title with generous line-heights */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]">
                  ⚡ Studio Ingestion Engine
                </span>
                <span className="hidden sm:inline-flex text-xs text-slate-400 font-mono">
                  Press <kbd className="mx-1 px-2 py-0.5 rounded-lg bg-[#EEF2F7] text-slate-700 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] text-[10px] font-bold"> / </kbd> to focus
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                Archive High-Res Social Media
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                Save photos, full reels, audio tracks, and carousels locally with encrypted hash validation.
              </p>
            </div>

            {/* Live Detected Platform Pill */}
            <AnimatePresence>
              {detected !== 'unknown' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff]"
                  style={{
                    backgroundColor: currentConfig.bg,
                    color: currentConfig.color,
                    borderColor: currentConfig.border,
                  }}
                >
                  {currentConfig.icon}
                  <span>{currentConfig.name} Detected</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Input Box */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="relative flex items-center w-full">
              
              {/* Sunken Neumorphic Input Well */}
              <div className="w-full flex items-center rounded-2xl bg-[#E5EBF2] shadow-[inset_4px_4px_8px_#cbd5e1,inset_-4px_-4px_8px_#ffffff] p-2 sm:p-2.5 border border-white/40 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition-all duration-300">
                
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="masukan url yang ingin didownload disini..."
                  disabled={submitting}
                  className="w-full bg-transparent px-3 sm:px-5 py-3 text-sm sm:text-base text-slate-800 placeholder-slate-400 font-medium focus:outline-none disabled:opacity-50"
                />

                {/* Inside Input Action Buttons */}
                <div className="flex items-center gap-2.5 pr-1 sm:pr-2 shrink-0">
                  {/* Paste Button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handlePaste}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <IconPaste className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Paste</span>
                  </motion.button>

                  {/* Primary Download CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={!url.trim() || submitting}
                    className="group relative flex items-center gap-3 pl-5 pr-2.5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-[4px_4px_14px_rgba(79,70,229,0.35),-2px_-2px_8px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_20px_rgba(79,70,229,0.45)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    <span>{submitting ? 'Processing...' : 'Download'}</span>
                    
                    {/* Nested Circular Trailing Icon */}
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconDownload className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* REAL-TIME PROGRESS BAR UNDER INPUT */}
            <AnimatePresence>
              {isProgressActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                  className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#EEF2F7] shadow-[5px_5px_12px_#cbd5e1,-5px_-5px_12px_#ffffff] border border-white/80"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                      <span>{progressStep || 'Processing download job...'}</span>
                    </div>
                    <span className="font-extrabold text-indigo-600 font-mono text-sm">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Sunken Progress Track */}
                  <div className="w-full h-3.5 rounded-full bg-[#E2E8F0] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] overflow-hidden p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.5)] animate-progress-shimmer"
                      style={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Banner */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]"
                >
                  <div className="flex items-center gap-2.5">
                    <IconAlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="leading-relaxed">{submitError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClearError}
                    className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold hover:bg-rose-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Supported Platform Badges */}
          <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2.5 pt-3 border-t border-slate-200/70">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-mono mr-1">
              Supported Platforms:
            </span>
            {(['instagram', 'tiktok', 'x', 'youtube', 'reddit', 'pinterest', 'threads'] as PlatformType[]).map(
              (p) => {
                const cfg = PLATFORM_CONFIG[p];
                const isSelected = detected === p;
                return (
                  <motion.div
                    key={p}
                    whileHover={{ scale: 1.05 }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isSelected
                        ? 'shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff] scale-105'
                        : 'bg-[#EEF2F7] text-slate-600 shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-slate-900'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: cfg.bg,
                            color: cfg.color,
                            borderColor: cfg.border,
                          }
                        : undefined
                    }
                  >
                    {cfg.icon}
                    <span>{cfg.name}</span>
                  </motion.div>
                );
              }
            )}
          </div>

        </div>
      </div>
    </motion.section>
  );
}
