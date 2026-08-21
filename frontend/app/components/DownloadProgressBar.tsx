'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconDownload,
  IconCheck,
  IconSparkles,
} from './Icons';

interface DownloadProgressBarProps {
  url: string;
  platform?: string;
  isQueued?: boolean;
}

function getPlatformIcon(platform?: string) {
  if (!platform) return <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />;
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <IconInstagram className="w-3.5 h-3.5 text-pink-500" />;
    case 'tiktok':
      return <IconTikTok className="w-3.5 h-3.5 text-slate-900" />;
    case 'threads':
      return <IconThreads className="w-3.5 h-3.5 text-slate-900" />;
    case 'youtube':
      return <IconYouTube className="w-3.5 h-3.5 text-red-500" />;
    case 'x':
    case 'twitter':
      return <IconX className="w-3.5 h-3.5 text-sky-500" />;
    case 'reddit':
      return <IconReddit className="w-3.5 h-3.5 text-orange-500" />;
    case 'pinterest':
      return <IconPinterest className="w-3.5 h-3.5 text-red-600" />;
    default:
      return <IconDownload className="w-3.5 h-3.5 text-indigo-600" />;
  }
}

export function DownloadProgressBar({ url, platform, isQueued = false }: DownloadProgressBarProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 0.5);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Determine stage based on elapsed time
  const currentStage = isQueued
    ? 0
    : seconds < 2
    ? 1
    : seconds < 5
    ? 2
    : 3;

  const stageLabels = [
    'Queued in Pipeline...',
    'Connecting & Authenticating CDN...',
    'Extracting High-Res Media & Captions...',
    'Finalizing & Writing to Local Vault...',
  ];

  const pipelineSteps = [
    { label: 'Connect', desc: 'CDN Handshake' },
    { label: 'Parse', desc: 'Metadata' },
    { label: 'Stream', desc: '1080p / 4K' },
    { label: 'Vault', desc: 'Save & Index' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-full max-w-3xl rounded-[22px] bg-white border border-indigo-100 p-4 sm:p-5 shadow-[0_10px_30px_rgba(79,70,229,0.08)] flex flex-col gap-4"
    >
      {/* Top Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Live Pulsing Beacon */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-[8px] bg-indigo-50 border border-indigo-200 shrink-0">
            <span className="absolute w-3 h-3 rounded-full bg-indigo-500 animate-ping opacity-75" />
            <span className="relative w-2 h-2 rounded-full bg-indigo-600" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-mono font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shrink-0">
                {getPlatformIcon(platform)}
                <span>{platform || 'Auto'}</span>
              </span>

              <span className="text-xs font-bold text-slate-800 truncate">
                {stageLabels[currentStage]}
              </span>
            </div>

            <span className="text-[11px] font-mono text-slate-400 truncate max-w-sm sm:max-w-md mt-0.5">
              {url}
            </span>
          </div>
        </div>

        {/* Right Timer Badge */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            Elapsed
          </span>
          <span className="min-w-[48px] h-6 px-2 rounded-[6px] bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold flex items-center justify-center">
            {seconds.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* The Sleek Glowing Modern Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="relative h-2.5 sm:h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/60 p-0.5">
          {/* Progress fill beam with dynamic gradient & animated shimmer */}
          <div className="h-full w-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 animate-stream-flow relative overflow-hidden shadow-[0_0_14px_rgba(99,102,241,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-beam" />
          </div>
        </div>
      </div>

      {/* 4-Stage Visual Micro-Pipeline */}
      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
        {pipelineSteps.map((step, idx) => {
          const isDone = currentStage > idx;
          const isActive = currentStage === idx;

          return (
            <div key={step.label} className="flex flex-col items-center text-center gap-1">
              <div className="flex items-center gap-1.5">
                {/* Step Squircle Dot */}
                <div
                  className={`w-4 h-4 rounded-[4px] flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200 animate-pulse'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? <IconCheck className="w-2.5 h-2.5 text-white" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    isActive ? 'text-indigo-600' : isDone ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
