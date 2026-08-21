'use client';

import React, { useState } from 'react';
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

interface DownloadStudioProps {
  onQueueDownload: (url: string, platform?: string) => Promise<boolean>;
  isSubmitting?: boolean;
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

export function DownloadStudio({ onQueueDownload, isSubmitting = false }: DownloadStudioProps) {
  const [url, setUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');

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
    const success = await onQueueDownload(
      cleanUrl,
      selectedPlatform === 'all' ? undefined : selectedPlatform
    );
    if (success) {
      setUrl('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 py-4">
      
      {/* Studio Header */}
      <div className="flex flex-col items-center text-center gap-3 max-w-2xl px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Material 3 Social Archiver</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Archive Media from Any Platform
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          Download high-resolution photos, albums, reels, videos, and captions into your private local vault.
        </p>
      </div>

      {/* Main Ingestion Card: M3 Search Bar */}
      <div className="w-full max-w-3xl px-4">
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-3xl bg-white border border-slate-200 m3-elevation-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-2 sm:p-2.5 gap-2"
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
              placeholder="Paste Instagram, TikTok, Threads, YouTube, X, Reddit link..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
            />

            {/* Paste Button Chip */}
            <button
              type="button"
              onClick={handlePaste}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              title="Paste from clipboard"
            >
              <IconPaste className="w-3.5 h-3.5 text-slate-500" />
              <span>Paste</span>
            </button>
          </div>

          {/* M3 Primary Filled Button */}
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed m3-elevation-1 transition-all cursor-pointer shrink-0"
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

          {/* M3 Embedded Linear Progress Indicator */}
          {isSubmitting && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden rounded-b-3xl">
              <div className="h-full bg-indigo-600 animate-m3-progress rounded-full" />
            </div>
          )}
        </form>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mt-3 px-4 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}
      </div>

      {/* M3 Filter Chips: Supported Platforms */}
      <div className="flex flex-col items-center gap-2.5 w-full max-w-4xl px-4">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
          Platform Ingestion Mode
        </span>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 border border-indigo-300 text-indigo-950 font-extrabold shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
