'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  IconDownload,
  IconSparkles,
  IconPaste,
  IconAlertCircle,
  IconCheckCircle,
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
      setProgressStep('Enqueuing & validating link...');

      let current = 15;
      progressTimerRef.current = setInterval(() => {
        current += Math.floor(Math.random() * 8) + 4;
        if (current >= 92) {
          current = 92;
          setProgressStep('Extracting media & organizing vault...');
        } else if (current >= 65) {
          setProgressStep('Downloading high-resolution streams...');
        } else if (current >= 35) {
          setProgressStep('Resolving platform metadata & author...');
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
    <section className="relative w-full">
      {/* Outer Double-Bezel Hardware Enclosure (Neumorphic Card) */}
      <div className="rounded-[2.2rem] bg-[#EEF2F7] shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] p-3 sm:p-5 border border-white/80">
        
        {/* Inner Concentric Core */}
        <div className="rounded-[calc(2.2rem-0.75rem)] bg-[#F4F7FB] border border-white/90 p-5 sm:p-8 shadow-[inset_2px_2px_5px_#e2e8f0,inset_-2px_-2px_5px_#ffffff] flex flex-col gap-6">
          
          {/* Header Eyebrow & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]">
                  ⚡ Studio Ingestion Engine
                </span>
                <span className="hidden sm:inline-flex text-[11px] text-slate-500 font-mono">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-[#EEF2F7] text-slate-700 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] text-[10px]"> / </kbd> to focus
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                Archive High-Res Social Media
              </h1>
            </div>

            {/* Live Detected Platform Pill */}
            {detected !== 'unknown' && (
              <div
                className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all duration-300 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] animate-spring-pop"
                style={{
                  backgroundColor: currentConfig.bg,
                  color: currentConfig.color,
                  borderColor: currentConfig.border,
                }}
              >
                {currentConfig.icon}
                <span>{currentConfig.name} Detected</span>
              </div>
            )}
          </div>

          {/* Form Input Box */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative flex items-center w-full">
              
              {/* Sunken Neumorphic Input Well */}
              <div className="w-full flex items-center rounded-2xl bg-[#E5EBF2] shadow-[inset_4px_4px_8px_#cbd5e1,inset_-4px_-4px_8px_#ffffff] p-1.5 sm:p-2 border border-white/40 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition-all duration-200">
                
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste Instagram, TikTok, X, YouTube, Reddit, or Pinterest link..."
                  disabled={submitting}
                  className="w-full bg-transparent px-3 sm:px-4 py-2.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 font-medium focus:outline-none disabled:opacity-50"
                />

                {/* Inside Input Action Buttons */}
                <div className="flex items-center gap-2 pr-1 sm:pr-2 shrink-0">
                  {/* Paste Button */}
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <IconPaste className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>

                  {/* Primary Download CTA Button (Button-in-Button Architecture) */}
                  <button
                    type="submit"
                    disabled={!url.trim() || submitting}
                    className="group relative flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-[4px_4px_12px_rgba(79,70,229,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] hover:shadow-[5px_5px_18px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    <span>{submitting ? 'Processing...' : 'Download'}</span>
                    
                    {/* Nested Circular Trailing Icon */}
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                      {submitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconDownload className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* REAL-TIME PROGRESS BAR UNDER INPUT */}
            {isProgressActive && (
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#EEF2F7] shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff] border border-white/80 animate-spring-pop">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span>{progressStep || 'Processing download job...'}</span>
                  </div>
                  <span className="font-extrabold text-indigo-600 font-mono">
                    {progressPercent}%
                  </span>
                </div>

                {/* Sunken Progress Track */}
                <div className="w-full h-3 rounded-full bg-[#E2E8F0] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out animate-progress-shimmer"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Banner */}
            {submitError && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] animate-spring-pop">
                <div className="flex items-center gap-2">
                  <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
                <button
                  type="button"
                  onClick={onClearError}
                  className="px-2 py-1 rounded-lg bg-rose-100/80 text-rose-800 text-[11px] font-bold hover:bg-rose-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </form>

          {/* Supported Platform Badges */}
          <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 pt-2 border-t border-slate-200/60">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-mono mr-1">
              Platforms:
            </span>
            {(['instagram', 'tiktok', 'x', 'youtube', 'reddit', 'pinterest', 'threads'] as PlatformType[]).map(
              (p) => {
                const cfg = PLATFORM_CONFIG[p];
                const isSelected = detected === p;
                return (
                  <div
                    key={p}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isSelected
                        ? 'shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] scale-105'
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
                  </div>
                );
              }
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
