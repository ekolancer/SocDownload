'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSparkles,
  IconInstagram,
  IconTikTok,
  IconX,
  IconYouTube,
  IconThreads,
  IconClose,
  IconCheckCircle,
  IconAlertCircle,
  IconBookmark,
  IconVidara,
} from '@/components/ui/Icons';
import { JobRow } from '@/components/studio/JobPipeline';

interface DownloadStudioProps {
  onQueueDownload: (url: string, platform?: string) => Promise<{ success: boolean; jobId?: number }>;
  isSubmitting?: boolean;
  activeJob?: JobRow | null;
  jobs?: JobRow[];
}

const PLATFORM_CHIPS = [
  { id: 'all', label: 'Auto Detect', icon: IconSparkles, isSpecial: true },
  { id: 'instagram', label: 'Instagram', icon: IconInstagram },
  { id: 'tiktok', label: 'TikTok', icon: IconTikTok },
  { id: 'threads', label: 'Threads', icon: IconThreads },
  { id: 'x', label: 'X (Twitter)', icon: IconX },
  { id: 'youtube', label: 'YouTube', icon: IconYouTube },
  { id: 'vidara', label: 'Vidara', icon: IconVidara },
];

function detectPlatform(rawUrl: string): string | null {
  const u = rawUrl.toLowerCase().trim();
  if (!u) return null;
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('threads.net') || u.includes('threads.com')) return 'threads';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'x';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('reddit.com') || u.includes('redd.it')) return 'reddit';
   if (u.includes('pinterest.com') || u.includes('pin.it')) return 'pinterest';
   if (/vidara\.to\/v\/[a-z0-9_-]+/i.test(u)) return 'vidara';

  return null;
}

export function DownloadStudio({
  onQueueDownload,
  isSubmitting = false,
  activeJob = null,
  jobs = [],
}: DownloadStudioProps) {
  const [url, setUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [singleJobId, setSingleJobId] = useState<number | null>(null);

  // Smooth kinetic progress state (0 to 1)
  const [progressFraction, setProgressFraction] = useState<number>(0);
  const [displayPercent, setDisplayPercent] = useState<number>(0);
  const [progressState, setProgressState] = useState<'idle' | 'queued' | 'running' | 'done' | 'dup' | 'failed'>('idle');

  // Animation frame ref for ultra-smooth 60fps number interpolation
  const animationFrameRef = useRef<number | null>(null);
  const targetPercentRef = useRef<number>(0);

  // Live Auto-Detected Platform
  const detectedPlatform = detectPlatform(url);

  // Find currently tracked job initiated from this studio
  const currentJob = singleJobId
    ? jobs.find((j) => j.id === singleJobId) || (activeJob?.id === singleJobId ? activeJob : null)
    : null;

  // Smooth continuous numeric counter interpolation
  useEffect(() => {
    targetPercentRef.current = Math.round(progressFraction * 100);

    const updateDisplay = () => {
      setDisplayPercent((current) => {
        const target = targetPercentRef.current;
        if (current === target) return current;
        const diff = target - current;
        // Smooth lerp step with minimum delta
        const step = diff > 0 ? Math.max(1, Math.ceil(diff * 0.15)) : Math.min(-1, Math.floor(diff * 0.15));
        return Math.min(Math.max(current + step, 0), 100);
      });
      animationFrameRef.current = requestAnimationFrame(updateDisplay);
    };

    animationFrameRef.current = requestAnimationFrame(updateDisplay);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [progressFraction]);

  // Synchronize progressFraction and progressState with job lifecycle
  useEffect(() => {
    if (!singleJobId) {
      if (!isSubmitting) {
        setProgressState('idle');
        setProgressFraction(0);
      }
      return;
    }

    if (currentJob) {
      if (currentJob.status === 'queued') {
        setProgressState('queued');
        setProgressFraction((prev) => Math.max(prev, 0.18));
      } else if (currentJob.status === 'running') {
        setProgressState('running');
        setProgressFraction((prev) => Math.max(prev, 0.42));
      } else if (currentJob.status === 'done') {
        setProgressState('done');
        setProgressFraction(1);
        const timer = setTimeout(() => {
          setSingleJobId(null);
          setProgressState('idle');
          setProgressFraction(0);
        }, 2600);
        return () => clearTimeout(timer);
      } else if (currentJob.status === 'dup') {
        setProgressState('dup');
        setProgressFraction(1);
        const timer = setTimeout(() => {
          setSingleJobId(null);
          setProgressState('idle');
          setProgressFraction(0);
        }, 2600);
        return () => clearTimeout(timer);
      } else if (currentJob.status === 'failed') {
        setProgressState('failed');
        setProgressFraction(1);
        const timer = setTimeout(() => {
          setSingleJobId(null);
          setProgressState('idle');
          setProgressFraction(0);
        }, 3200);
        return () => clearTimeout(timer);
      }
    }
  }, [currentJob, singleJobId, isSubmitting]);

  // Organic asymptotic progress advancement while downloading
  useEffect(() => {
    if (progressState === 'running') {
      const interval = setInterval(() => {
        setProgressFraction((prev) => {
          if (prev < 0.88) {
            // Asymptotic deceleration curve: faster at first, slowing down near 88%
            const remaining = 0.90 - prev;
            return prev + remaining * 0.08;
          }
          return prev;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [progressState]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setErrorMsg('');
      }
    } catch {
      setErrorMsg('Clipboard permission denied');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setErrorMsg('Please paste a valid media URL');
      return;
    }

    setErrorMsg('');
    setProgressState('queued');
    setProgressFraction(0.12);

    const result = await onQueueDownload(
      cleanUrl,
      selectedPlatform === 'all' ? undefined : selectedPlatform
    );

    if (result.success && result.jobId) {
      setSingleJobId(result.jobId);
      setUrl('');
    } else {
      setProgressState('failed');
      setProgressFraction(1);
      setTimeout(() => {
        setProgressState('idle');
        setProgressFraction(0);
      }, 3000);
    }
  };

  const isBusy = isSubmitting || progressState === 'queued' || progressState === 'running';

  return (
    <section className="w-full max-w-4xl flex flex-col items-center text-center gap-6 pt-2 pb-6 relative">
      <div className="relative z-10 p-6 sm:p-10 rounded-[2rem] bg-slate-900/60 backdrop-blur-xl w-full flex flex-col items-center transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/[0.08]">
        
        {/* Ambient Luminescence Backdrop Orb */}
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-72 sm:w-96 h-28 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-indigo-500/15 blur-3xl pointer-events-none -z-10 rounded-full" />

          {/* Micro Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase mb-3 shadow-2xs backdrop-blur-sm">
            <IconSparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Universal Instant Ingestion</span>
          </div>

          {/* Premium High-End Slogan */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-3 selection:bg-emerald-500/20">
            <span className="text-white drop-shadow-xs font-black">Paste </span>
            <span className="relative inline-block text-emerald-400 font-black">
              it !
              <span className="absolute -bottom-1 left-0 right-0 h-1 bg-emerald-400 rounded-full opacity-70" />
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mb-7 sm:mb-8 font-medium leading-relaxed">
            Download high-resolution posts, reels, stories, and audio albums instantly with automated platform discovery.
          </p>
        </div>


        {/* Ingestion URL Form Container */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-3xl flex flex-col md:flex-row gap-2.5 bg-slate-950/60 backdrop-blur-md p-2 rounded-2xl relative transition-all focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500/40 border border-white/[0.08] shadow-2xl"
        >
          <div className="flex-1 flex items-center gap-2 bg-slate-900/60 rounded-xl px-4 py-2.5 border border-white/[0.05] focus-within:bg-slate-900/90 transition-colors">
            <input
              type="url"
              required
              aria-label="Media URL"
              disabled={isBusy}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Paste social media URL here..."
              className="flex-grow bg-transparent border-none text-white focus:ring-0 focus:outline-none text-sm placeholder:text-slate-500 font-medium disabled:opacity-60"
            />

            {/* Live Auto-Detected Platform Pill */}
            {detectedPlatform && (
              <span className="flex items-center px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 text-[10px] font-mono font-bold shrink-0 capitalize border border-emerald-500/30 shadow-2xs">
                {detectedPlatform}
              </span>
            )}

            {/* Clear Input Button */}
            {url && !isBusy && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="w-5 h-5 rounded-full text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                title="Clear input"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {!url && !isBusy && (
              <button
                type="button"
                onClick={handlePaste}
                className="px-4 sm:px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 font-semibold transition-all active:scale-[0.98] text-xs sm:text-sm cursor-pointer border border-transparent hover:border-white/10"
              >
                Paste
              </button>
            )}

            {/* High-End Real-Time Dynamic Progress Button */}
            <button
              type="submit"
              disabled={isBusy || (!url.trim() && progressState === 'idle')}
              className={`group relative overflow-hidden min-w-[145px] sm:min-w-[165px] px-6 sm:px-8 py-2.5 rounded-xl font-bold transition-all duration-500 text-xs sm:text-sm select-none shadow-md cursor-pointer disabled:cursor-not-allowed ${
                progressState === 'done'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                  : progressState === 'dup'
                  ? 'bg-amber-600 text-white shadow-amber-500/30 ring-2 ring-amber-400/40'
                  : progressState === 'failed'
                  ? 'bg-rose-600 text-white shadow-rose-500/30 ring-2 ring-rose-400/40'
                  : isBusy
                  ? 'bg-slate-950 text-white shadow-emerald-500/30 border border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-950 shadow-white/10 transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:transform-none'
              }`}
            >
              {/* GPU-Accelerated Hardware Scale-X Fill Track (Silky Smooth 60fps) */}
              <AnimatePresence>
                {progressFraction > 0 && (
                  <motion.div
                    key="progress-fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progressFraction }}
                    transition={{
                      ease: [0.16, 1, 0.3, 1],
                      duration: progressState === 'done' || progressState === 'dup' ? 0.35 : 0.6,
                    }}
                    style={{ transformOrigin: 'left center', willChange: 'transform' }}
                    className={`absolute inset-0 transition-colors duration-500 ${
                      progressState === 'done'
                        ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 shadow-[0_0_24px_rgba(16,185,129,0.7)]'
                        : progressState === 'dup'
                        ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 shadow-[0_0_24px_rgba(245,158,11,0.7)]'
                        : progressState === 'failed'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                    }`}
                  >
                    {/* Continuous Shimmer Light Wave Overlay */}
                    {isBusy && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-beam pointer-events-none" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Foreground Label & Fluid Dynamic Counter */}
              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm font-semibold">
                {progressState === 'done' ? (
                  <motion.span
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="flex items-center gap-1.5 text-white font-bold tracking-tight"
                  >
                    <IconCheckCircle className="w-4 h-4 text-white drop-shadow-xs" />
                    <span>✓ Downloaded</span>
                  </motion.span>
                ) : progressState === 'dup' ? (
                  <motion.span
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="flex items-center gap-1.5 text-white font-bold tracking-tight"
                  >
                    <IconBookmark className="w-4 h-4 text-white drop-shadow-xs" />
                    <span>✓ In Vault</span>
                  </motion.span>
                ) : progressState === 'failed' ? (
                  <motion.span
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="flex items-center gap-1.5 text-white font-bold tracking-tight"
                  >
                    <IconAlertCircle className="w-4 h-4 text-white drop-shadow-xs" />
                    <span>✕ Failed</span>
                  </motion.span>
                ) : isBusy ? (
                  <span className="flex items-center gap-2 font-mono text-white">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0 shadow-xs" />
                    <span className="font-bold tracking-tight">
                      {progressState === 'queued'
                        ? 'Connecting...'
                        : `Downloading ${displayPercent}%`}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-slate-950 font-bold">
                    <span>Download</span>
                    <div className="w-4.5 h-4.5 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform duration-200">
                      ↓
                    </div>
                  </span>
                )}
              </span>
            </button>
          </div>
        </form>

        {/* Optional Error Alert */}
        {errorMsg && (
          <div className="w-full max-w-3xl px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs font-semibold text-rose-300 text-left mt-2 animate-fade-in shadow-2xs backdrop-blur-md">
            ⚠ {errorMsg}
          </div>
        )}

        {/* Quick Filter Buttons Row */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mt-6 sm:mt-7">
          {PLATFORM_CHIPS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPlatform === p.id;
            const isAutoDetect = p.id === 'all';

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-panel text-xs transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected || (isAutoDetect && selectedPlatform === 'all')
                    ? 'text-emerald-400 font-bold border-emerald-500/30 bg-emerald-950/40 shadow-sm scale-105'
                    : 'text-slate-400 font-medium hover:text-white hover:bg-slate-800/80 hover:shadow-2xs'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-inherit" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
