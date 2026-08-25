'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSparkles,
  IconInstagram,
  IconTikTok,
  IconX,
  IconYouTube,
  IconThreads,
  IconClose,
} from './Icons';
import { DownloadProgressBar } from './DownloadProgressBar';
import { JobRow } from './JobPipeline';

interface DownloadStudioProps {
  onQueueDownload: (url: string, platform?: string) => Promise<{ success: boolean; jobId?: number }>;
  isSubmitting?: boolean;
  activeJob?: JobRow | null;
}

const PLATFORM_CHIPS = [
  { id: 'all', label: 'Auto Detect', icon: IconSparkles, isSpecial: true },
  { id: 'instagram', label: 'Instagram', icon: IconInstagram },
  { id: 'tiktok', label: 'TikTok', icon: IconTikTok },
  { id: 'threads', label: 'Threads', icon: IconThreads },
  { id: 'x', label: 'X (Twitter)', icon: IconX },
  { id: 'youtube', label: 'YouTube', icon: IconYouTube },
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
  return null;
}

export function DownloadStudio({
  onQueueDownload,
  isSubmitting = false,
  activeJob = null,
}: DownloadStudioProps) {
  const [url, setUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [singleJobId, setSingleJobId] = useState<number | null>(null);
  const [dismissedJobId, setDismissedJobId] = useState<number | null>(null);

  // Live Auto-Detected Platform
  const detectedPlatform = detectPlatform(url);
  const effectivePlatform = selectedPlatform !== 'all' ? selectedPlatform : detectedPlatform;

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
    setSubmittedUrl(cleanUrl);
    setDismissedJobId(null);

    const result = await onQueueDownload(
      cleanUrl,
      selectedPlatform === 'all' ? undefined : selectedPlatform
    );

    if (result.success && result.jobId) {
      setSingleJobId(result.jobId);
      setUrl('');
    }
  };

  // Only show single progress for jobs initiated by THIS single download studio
  const isThisSingleJob = activeJob && singleJobId && activeJob.id === singleJobId;
  const isCurrentJobDismissed = activeJob && activeJob.id === dismissedJobId;
  const isJobActiveOrRecent = isThisSingleJob && !isCurrentJobDismissed;
  const isJobDone = activeJob?.status === 'done' || activeJob?.status === 'dup';
  const isJobFailed = activeJob?.status === 'failed';
  const showActiveProgress = (isSubmitting && !activeJob) || isJobActiveOrRecent;

  const progressUrl = (isThisSingleJob ? activeJob?.url : null) || submittedUrl || url;
  const progressPlatform = (isThisSingleJob ? activeJob?.platform : null) || effectivePlatform || undefined;

  return (
    <section className="w-full max-w-4xl flex flex-col items-center text-center gap-6 pt-2 pb-6 relative">
      <div className="relative z-10 p-6 sm:p-10 rounded-2xl glass-panel w-full flex flex-col items-center transition-all hover:bg-white/50 duration-500">
        
        {/* Headline & Subtitle with Text Glow */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-4 text-glow font-bold leading-tight tracking-tight">
          Download Media<br />from Any Platform
        </h1>
        <p className="text-sm text-slate-700 max-w-xl mx-auto mb-8 sm:mb-10 font-medium">
          Download the content of social media and make URL social media Downloader for continuous discovery.
        </p>

        {/* Ingestion URL Form Container */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-3xl flex flex-col md:flex-row gap-3 glass-panel p-2 rounded-xl relative transition-all focus-within:ring-2 focus-within:ring-indigo-400 focus-within:shadow-lg focus-within:bg-white/60"
        >
          <div className="flex-1 flex items-center gap-2 bg-white/50 rounded-lg px-4 py-2 focus-within:bg-white/80 transition-colors">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Paste social media URL here..."
              className="flex-grow bg-transparent border-none text-slate-900 focus:ring-0 focus:outline-none text-sm placeholder-slate-500 font-medium"
            />

            {/* Live Auto-Detected Platform Pill */}
            {detectedPlatform && (
              <span className="flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold shrink-0 capitalize">
                {detectedPlatform}
              </span>
            )}

            {/* Clear Input Button */}
            {url && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="w-5 h-5 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center shrink-0 transition-colors"
                title="Clear input"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {!url && (
              <button
                type="button"
                onClick={handlePaste}
                className="px-5 sm:px-6 py-2.5 rounded-lg text-indigo-700 hover:bg-white/80 hover:shadow-sm font-semibold transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
              >
                Paste
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="px-6 sm:px-8 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold transition-all shadow-lg shadow-indigo-500/40 transform hover:-translate-y-0.5 active:scale-95 hover:shadow-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>Downloading...</span>
                </span>
              ) : (
                <span>Download</span>
              )}
            </button>
          </div>
        </form>

        {/* Dedicated Single Progress Bar */}
        <div className="w-full max-w-3xl mt-3">
          <AnimatePresence>
            {showActiveProgress && (
              <DownloadProgressBar
                url={progressUrl}
                platform={progressPlatform}
                isQueued={activeJob?.status === 'queued'}
                isDone={isJobDone}
                error={isJobFailed ? activeJob?.error || 'Download failed' : null}
                onAutoClose={() => {
                  if (activeJob) setDismissedJobId(activeJob.id);
                  setSingleJobId(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* Error Message */}
          {errorMsg && (
            <div className="px-4 py-2 rounded-xl bg-rose-50/90 border border-rose-200 text-xs font-semibold text-rose-700 text-left mt-2">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Quick Filter Buttons Row */}
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mt-6 sm:mt-8">
          {PLATFORM_CHIPS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPlatform === p.id;
            const isAutoDetect = p.id === 'all';

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-xs transition-all active:scale-95 cursor-pointer ${
                  isSelected || (isAutoDetect && selectedPlatform === 'all')
                    ? 'text-indigo-700 font-semibold border-indigo-200 bg-indigo-50/60 shadow-md scale-105'
                    : 'text-slate-700 font-medium hover:text-slate-900 hover:bg-white/80 hover:scale-105 hover:shadow-md'
                }`}
              >
                <Icon className="w-4 h-4 text-inherit" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
