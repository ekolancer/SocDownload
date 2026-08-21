'use client';

import React, { useState } from 'react';
import {
  IconActivity,
  IconCheckCircle,
  IconAlertCircle,
  IconRefresh,
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
  if (p === 'instagram') return <IconInstagram className="w-3.5 h-3.5 text-pink-600" />;
  if (p === 'threads') return <IconThreads className="w-3.5 h-3.5 text-slate-800" />;
  if (p === 'x') return <IconX className="w-3.5 h-3.5 text-slate-800" />;
  if (p === 'tiktok') return <IconTikTok className="w-3.5 h-3.5 text-teal-600" />;
  if (p === 'youtube') return <IconYouTube className="w-3.5 h-3.5 text-red-600" />;
  if (p === 'reddit') return <IconReddit className="w-3.5 h-3.5 text-orange-600" />;
  if (p === 'pinterest') return <IconPinterest className="w-3.5 h-3.5 text-red-600" />;
  return <IconActivity className="w-3.5 h-3.5 text-indigo-600" />;
}

function getStatusBadge(status: JobRow['status']) {
  switch (status) {
    case 'running':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          Running
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Queued
        </span>
      );
    case 'done':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          <IconCheckCircle className="w-3 h-3 text-emerald-600" />
          Done
        </span>
      );
    case 'dup':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          Duplicate
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]">
          <IconAlertCircle className="w-3 h-3 text-rose-600" />
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
    <section className="flex flex-col gap-4 w-full">
      {/* Header with Title & Clear Button */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff]">
            <IconActivity className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
              Activity Pipeline & Download Queue
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Real-time job queue and ingestion history
            </span>
          </div>
        </div>

        {/* Clear Jobs Button */}
        {jobs.length > 0 && onClearJobs && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-rose-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer disabled:opacity-50"
            title="Clear completed and failed jobs"
          >
            <IconTrash className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : 'text-rose-500'}`} />
            <span>{clearing ? 'Clearing...' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* Jobs List Container */}
      <div className="rounded-[2rem] bg-[#EEF2F7] shadow-[8px_8px_20px_#cbd5e1,-8px_-8px_20px_#ffffff] border border-white/80 p-3 sm:p-5 flex flex-col gap-3">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center mb-3 text-slate-400">
              <IconActivity className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-700">Queue is Empty</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Paste a URL above to start downloading photos, videos, or audio albums.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl bg-[#F4F7FB] border border-white/90 p-3.5 sm:p-4 shadow-[3px_3px_8px_#d5dde9,-3px_-3px_8px_#ffffff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200"
              >
                {/* Left Info: Platform, ID, URL */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-[#EEF2F7] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] shrink-0">
                    {getPlatformIcon(job.platform)}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-800 capitalize">
                        {job.platform}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        #{job.id}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                        • {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <span className="text-xs text-slate-600 truncate font-mono max-w-full" title={job.url}>
                      {job.url}
                    </span>

                    {job.error && (
                      <div className="mt-1 p-2 rounded-lg bg-rose-50 border border-rose-200/80 text-[11px] font-mono text-rose-700 break-all">
                        {job.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Status */}
                <div className="shrink-0 self-end sm:self-center">
                  {getStatusBadge(job.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
