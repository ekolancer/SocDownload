'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  IconDownload,
  IconSparkles,
  IconPaste,
  IconLink,
  IconInstagram,
  IconTikTok,
  IconX,
  IconYouTube,
  IconReddit,
  IconPinterest,
  IconThreads,
} from './Icons';
import { DownloadProgressBar } from './DownloadProgressBar';
import { JobRow } from './JobPipeline';

interface DownloadStudioProps {
  onQueueDownload: (url: string, platform?: string) => Promise<boolean>;
  isSubmitting?: boolean;
  activeJob?: JobRow | null;
}

const PLATFORMS = [
  { id: 'all', label: 'Auto Detect', icon: IconSparkles, color: 'text-indigo-600' },
  { id: 'instagram', label: 'Instagram', icon: IconInstagram, color: 'text-pink-600' },
  { id: 'tiktok', label: 'TikTok', icon: IconTikTok, color: 'text-slate-900' },
  { id: 'threads', label: 'Threads', icon: IconThreads, color: 'text-slate-900' },
  { id: 'x', label: 'X (Twitter)', icon: IconX, color: 'text-slate-900' },
  { id: 'youtube', label: 'YouTube', icon: IconYouTube, color: 'text-red-600' },
  { id: 'reddit', label: 'Reddit', icon: IconReddit, color: 'text-orange-600' },
  { id: 'pinterest', label: 'Pinterest', icon: IconPinterest, color: 'text-red-700' },
];

export function DownloadStudio({
  onQueueDownload,
  isSubmitting = false,
  activeJob = null,
}: DownloadStudioProps) {
  const [url, setUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [dismissedJobId, setDismissedJobId] = useState<number | null>(null);

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
    const success = await onQueueDownload(
      cleanUrl,
      selectedPlatform === 'all' ? undefined : selectedPlatform
    );
    if (success) {
      setUrl('');
    }
  };

  const isCurrentJobDismissed = activeJob && activeJob.id === dismissedJobId;
  const isJobActiveOrRecent = activeJob && !isCurrentJobDismissed;
  const isJobDone = activeJob?.status === 'done' || activeJob?.status === 'dup';
  const isJobFailed = activeJob?.status === 'failed';
  const showActiveProgress = isSubmitting || isJobActiveOrRecent;

  const progressUrl = activeJob?.url || submittedUrl || url;
  const progressPlatform = activeJob?.platform || (selectedPlatform === 'all' ? undefined : selectedPlatform);

  return (
    <div className="w-full flex flex-col items-center gap-7 py-2">
      
      {/* Studio Header (Wider container to prevent title wrapping) */}
      <div className="flex flex-col items-center text-center gap-3 max-w-4xl px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[8px] text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
          <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Social Media Downloader</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-extrabold text-slate-900 tracking-tight leading-tight sm:whitespace-nowrap">
          Download Media from Any Platform
        </h1>
      </div>

      {/* Main Ingestion Card: Search & Submit */}
      <div className="w-full max-w-3xl px-4 flex flex-col gap-4">
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-[24px] bg-white border border-slate-200/90 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-2 sm:p-2.5 gap-2"
        >
          {/* Input Field with leading icon */}
          <div className="flex-1 flex items-center gap-3 px-3 py-1.5 min-w-0">
            <IconLink className="w-5 h-5 text-slate-400 shrink-0" />
            
            <input
              type="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Input url here..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
            />

            {/* Paste Button Chip */}
            <button
              type="button"
              onClick={handlePaste}
              className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
              title="Paste from clipboard"
            >
              <IconPaste className="w-3.5 h-3.5 text-slate-500" />
              <span>Paste</span>
            </button>
          </div>

          {/* Primary Filled Button */}
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-[14px] text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 transition-all cursor-pointer shrink-0"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>Queuing...</span>
              </>
            ) : (
              <>
                <IconDownload className="w-4 h-4 text-white" />
                <span>Download</span>
              </>
            )}
          </button>
        </form>

        {/* Dynamic High-End Progress Bar with Smooth Auto-Close Animation */}
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
              }}
            />
          )}
        </AnimatePresence>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="px-4 py-2.5 rounded-[12px] bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}
      </div>

      {/* Supported Platforms Infinite Marquee Badge */}
      <div className="flex flex-col items-center gap-2 w-full max-w-3xl px-4">
        
        {/* Outer Pill Container with Gradient Edge Fades */}
        <div className="relative w-full overflow-hidden rounded-full bg-white border border-slate-200/90 shadow-sm p-1.5 flex items-center">
          
          {/* Left & Right Edge Fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

          {/* Continuous Left-Scrolling Marquee Track */}
          <div className="animate-marquee-left flex items-center gap-2">
            {/* First sequence */}
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={`seq1-${p.id}`}
                  type="button"
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : p.color}`} />
                  <span className="whitespace-nowrap">{p.label}</span>
                </button>
              );
            })}

            {/* Duplicate sequence for seamless infinite loop */}
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={`seq2-${p.id}`}
                  type="button"
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : p.color}`} />
                  <span className="whitespace-nowrap">{p.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
}
