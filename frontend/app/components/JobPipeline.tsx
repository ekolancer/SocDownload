'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconActivity,
  IconCheckCircle,
  IconAlertCircle,
  IconTrash,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
} from './Icons';

export interface JobRow {
  id: number;
  platform: string;
  url: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'dup';
  error: string | null;
  created_at: string;
}

interface JobPipelineProps {
  jobs: JobRow[];
  onClearJobs?: () => Promise<void>;
}

function getPlatformIcon(platform: string) {
  const p = (platform || '').toLowerCase();
  if (p === 'instagram') return <IconInstagram className="w-4 h-4 text-pink-600" />;
  if (p === 'threads') return <IconThreads className="w-4 h-4 text-slate-800" />;
  if (p === 'x') return <IconX className="w-4 h-4 text-slate-800" />;
  if (p === 'tiktok') return <IconTikTok className="w-4 h-4 text-teal-600" />;
  if (p === 'youtube') return <IconYouTube className="w-4 h-4 text-red-600" />;
  if (p === 'reddit') return <IconReddit className="w-4 h-4 text-orange-600" />;
  if (p === 'pinterest') return <IconPinterest className="w-4 h-4 text-red-600" />;
  return <IconActivity className="w-4 h-4 text-indigo-600" />;
}

function getStatusBadge(status: JobRow['status']) {
  switch (status) {
    case 'running':
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          Running
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Queued
        </span>
      );
    case 'done':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Done
        </span>
      );
    case 'dup':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          Duplicate
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          <IconAlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Failed
        </span>
      );
    default:
      return null;
  }
}

export function JobPipeline({ jobs, onClearJobs }: JobPipelineProps) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!onClearJobs || clearing) return;
    setClearing(true);
    try {
      await onClearJobs();
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="flex flex-col gap-6 w-full">
      {/* Header with Title & Clear Button */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#EEF2F7] shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff]">
            <IconActivity className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight leading-snug">
              Activity Pipeline & Download Queue
            </h2>
            <span className="text-xs text-slate-500 font-mono leading-relaxed">
              Real-time job queue and ingestion history
            </span>
          </div>
        </div>

        {/* Clear Jobs Button */}
        {jobs.length > 0 && onClearJobs && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-rose-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer disabled:opacity-50"
            title="Clear completed and failed jobs"
          >
            <IconTrash className={`w-4 h-4 ${clearing ? 'animate-spin' : 'text-rose-500'}`} />
            <span>{clearing ? 'Clearing...' : 'Clear History'}</span>
          </motion.button>
        )}
      </div>

      {/* Jobs List Container */}
      <div className="rounded-[2.2rem] bg-[#EEF2F7] shadow-[10px_10px_24px_#cbd5e1,-10px_-10px_24px_#ffffff] border border-white/80 p-4 sm:p-6 flex flex-col gap-4">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center mb-4 text-slate-400">
              <IconActivity className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-700">Queue is Empty</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
              Paste a URL above to start downloading photos, videos, or audio albums.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="rounded-2xl bg-[#F4F7FB] border border-white/90 p-4 sm:p-5 shadow-[3px_3px_10px_#d5dde9,-3px_-3px_10px_#ffffff] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
                >
                  {/* Left Info: Platform, ID, URL */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-[#EEF2F7] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] shrink-0">
                      {getPlatformIcon(job.platform)}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-800 capitalize">
                          {job.platform}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          #{job.id}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
                          • {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <span className="text-xs text-slate-600 truncate font-mono max-w-full leading-relaxed" title={job.url}>
                        {job.url}
                      </span>

                      {job.error && (
                        <div className="mt-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-mono text-rose-700 break-all leading-relaxed">
                          {job.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Status */}
                  <div className="shrink-0 self-end sm:self-center">
                    {getStatusBadge(job.status)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
