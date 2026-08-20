'use client';

import React, { useState } from 'react';
import {
  IconActivity,
  IconCheck,
  IconAlertCircle,
  IconExternalLink,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
  IconFacebook,
} from './Icons';

export interface JobRow {
  id: number;
  platform: string;
  url: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'dup' | string;
  error: string | null;
  created_at: string;
}

interface JobPipelineProps {
  jobs: JobRow[];
}

export function JobPipeline({ jobs }: JobPipelineProps) {
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>Running</span>
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Queued</span>
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <IconCheck className="w-3 h-3 text-emerald-400" />
            <span>Completed</span>
          </span>
        );
      case 'dup':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <span>Duplicate (Skipped)</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <IconAlertCircle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <IconInstagram className="w-3.5 h-3.5 text-rose-400" />;
    if (p.includes('threads')) return <IconThreads className="w-3.5 h-3.5 text-slate-200" />;
    if (p.includes('x') || p.includes('twitter')) return <IconX className="w-3.5 h-3.5 text-sky-400" />;
    if (p.includes('tiktok')) return <IconTikTok className="w-3.5 h-3.5 text-teal-300" />;
    if (p.includes('youtube')) return <IconYouTube className="w-3.5 h-3.5 text-red-400" />;
    if (p.includes('reddit')) return <IconReddit className="w-3.5 h-3.5 text-orange-400" />;
    if (p.includes('pinterest')) return <IconPinterest className="w-3.5 h-3.5 text-rose-500" />;
    if (p.includes('facebook')) return <IconFacebook className="w-3.5 h-3.5 text-blue-400" />;
    return <IconActivity className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconActivity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Activity & Job Queue</h2>
          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-white/5 border border-white/10 text-indigo-300">
            {jobs.length}
          </span>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 rounded-2xl glass-panel border border-white/5 text-center text-slate-400 text-xs">
          No active download jobs recorded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {jobs.map((job) => {
            const hasError = !!job.error;
            const isErrorExpanded = expandedErrorId === job.id;

            return (
              <div
                key={job.id}
                className="flex flex-col rounded-xl bg-[#12141F] border border-white/[0.08] hover:border-white/15 transition-all p-3.5 sm:p-4 gap-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{job.id}
                    </span>

                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                      {getPlatformIcon(job.platform)}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate font-mono">
                        {job.url}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {job.created_at ? new Date(job.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(job.status)}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                      title="Open source URL"
                    >
                      <IconExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Error disclosure (if failed) */}
                {hasError && (
                  <div className="mt-1 pt-2 border-t border-white/5">
                    <button
                      onClick={() => setExpandedErrorId(isErrorExpanded ? null : job.id)}
                      className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      <IconAlertCircle className="w-3 h-3" />
                      <span>{isErrorExpanded ? 'Hide Error Details' : 'View Error Reason'}</span>
                    </button>

                    {isErrorExpanded && (
                      <div className="mt-2 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-mono break-all animate-fade-in">
                        {job.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
