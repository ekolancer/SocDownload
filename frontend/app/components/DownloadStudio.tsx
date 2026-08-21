'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  IconFacebook,
} from './Icons';

interface DownloadStudioProps {
  onDownload: (url: string) => Promise<boolean>;
  submitting: boolean;
  submitError: string;
  onClearError: () => void;
}

export type PlatformType =
  | 'instagram'
  | 'threads'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'pinterest'
  | 'facebook'
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
    if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) return 'facebook';
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
    color: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.3)',
    icon: <IconInstagram className="w-3.5 h-3.5" />,
  },
  threads: {
    name: 'Threads',
    color: '#E2E8F0',
    bg: 'rgba(226, 232, 240, 0.12)',
    border: 'rgba(226, 232, 240, 0.25)',
    icon: <IconThreads className="w-3.5 h-3.5" />,
  },
  x: {
    name: 'X (Twitter)',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    icon: <IconX className="w-3.5 h-3.5" />,
  },
  tiktok: {
    name: 'TikTok',
    color: '#2DD4BF',
    bg: 'rgba(45, 212, 191, 0.12)',
    border: 'rgba(45, 212, 191, 0.3)',
    icon: <IconTikTok className="w-3.5 h-3.5" />,
  },
  youtube: {
    name: 'YouTube',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: <IconYouTube className="w-3.5 h-3.5" />,
  },
  reddit: {
    name: 'Reddit',
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.3)',
    icon: <IconReddit className="w-3.5 h-3.5" />,
  },
  pinterest: {
    name: 'Pinterest',
    color: '#E11D48',
    bg: 'rgba(225, 29, 72, 0.12)',
    border: 'rgba(225, 29, 72, 0.3)',
    icon: <IconPinterest className="w-3.5 h-3.5" />,
  },
  facebook: {
    name: 'Facebook',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
    icon: <IconFacebook className="w-3.5 h-3.5" />,
  },
  unknown: {
    name: 'Auto-detect',
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.08)',
    border: 'rgba(148, 163, 184, 0.15)',
    icon: <IconSparkles className="w-3.5 h-3.5" />,
  },
};

export function DownloadStudio({
  onDownload,
  submitting,
  submitError,
  onClearError,
}: DownloadStudioProps) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = detectPlatform(url);
  const activePlatformConfig = PLATFORM_CONFIG[detected];

  // Global '/' keyboard shortcut to focus input
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || submitting) return;
    const ok = await onDownload(url.trim());
    if (ok) {
      setUrl('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (submitError) onClearError();
        inputRef.current?.focus();
      }
    } catch {
      // Fallback focus
      inputRef.current?.focus();
    }
  };

  return (
    <section className="relative w-full rounded-2xl p-6 sm:p-8 glass-panel border border-white/[0.08] glow-indigo overflow-hidden">
      {/* Background Decorative Ambient Gradient */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 rounded-full bg-gradient-to-tr from-fuchsia-500/10 via-pink-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto flex flex-col gap-5 text-center sm:text-left">
        {/* Studio Heading */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">
                Download Studio
              </h2>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ingest Any Post, Video or Album
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/5">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-bold">/</kbd>
            <span>to focus</span>
          </div>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl bg-[#0B0D14] border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
            {/* Detected Platform Tag */}
            <div className="hidden sm:flex items-center pl-3 pr-2 py-1">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-200"
                style={{
                  backgroundColor: activePlatformConfig.bg,
                  color: activePlatformConfig.color,
                  border: `1px solid ${activePlatformConfig.border}`,
                }}
              >
                {activePlatformConfig.icon}
                <span>{activePlatformConfig.name}</span>
              </div>
            </div>

            {/* URL Input */}
            <input
              ref={inputRef}
              type="url"
              className="flex-1 bg-transparent px-3.5 py-2.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Paste Instagram, X, TikTok, Threads, YouTube, Reddit post link..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (submitError) onClearError();
              }}
              disabled={submitting}
              autoComplete="off"
              spellCheck="false"
            />

            {/* Paste from Clipboard Button (if empty) */}
            {!url && (
              <button
                type="button"
                onClick={handlePaste}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                title="Paste from clipboard"
              >
                <IconPaste className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}

            {/* Submit Download CTA */}
            <button
              type="submit"
              disabled={submitting || !url.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold gradient-btn-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <IconDownload className="w-4 h-4" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium animate-fade-in">
              <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}
        </form>

        {/* Supported Platform Badges */}
        <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 pt-1 border-t border-white/[0.05]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono mr-1">
            Supported:
          </span>
          {(['instagram', 'threads', 'x', 'tiktok', 'youtube', 'reddit', 'pinterest'] as PlatformType[]).map(
            (p) => {
              const cfg = PLATFORM_CONFIG[p];
              const isSelected = detected === p;
              return (
                <div
                  key={p}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                    isSelected
                      ? 'scale-105 shadow-md'
                      : 'opacity-70 hover:opacity-100 bg-white/[0.03] text-slate-300 border border-white/5'
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
    </section>
  );
}
