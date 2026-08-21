'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconActivity,
  IconCheckCircle,
  IconClose,
  IconTrash,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconDownload,
} from './Icons';

export interface JobRow {
  id: number;
  platform: string;
  url: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'dup';
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

interface JobPipelineProps {
  jobs: JobRow[];
  onClearJobs?: () => Promise<void>;
}

function getPlatformIcon(platform: string) {
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

export function JobPipeline({ jobs, onClearJobs }: JobPipelineProps) {
  if (jobs.length === 0) return null;

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const finishedJobs = jobs.filter((j) => j.status === 'done' || j.status === 'failed' || j.status === 'dup');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <IconActivity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight">
              Ingestion Pipeline & Activity
            </h2>
            <p className="text-[11px] font-mono text-slate-500">
              {activeJobs.length} active tasks • {finishedJobs.length} completed
            </p>
          </div>
        </div>

        {onClearJobs && finishedJobs.length > 0 && (
          <button
            type="button"
            onClick={onClearJobs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <IconTrash className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Jobs List Container */}
      <div className="rounded-[22px] bg-white border border-slate-200/90 shadow-sm p-3.5 sm:p-4 flex flex-col gap-3 overflow-hidden">
        <AnimatePresence>
          {jobs.slice(0, 10).map((job) => {
            const isRunning = job.status === 'running';
            const isQueued = job.status === 'queued';
            const isDone = job.status === 'done' || job.status === 'dup';
            const isFailed = job.status === 'failed';

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={`relative flex flex-col gap-2.5 p-3.5 rounded-[16px] border transition-all overflow-hidden ${
                  isRunning
                    ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                    : isQueued
                    ? 'bg-amber-50/40 border-amber-200'
                    : isDone
                    ? 'bg-slate-50/60 border-slate-200/70'
                    : 'bg-rose-50/60 border-rose-200'
                }`}
              >
                {/* Main Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  {/* Left: Platform & Target URL */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-white text-slate-800 border border-slate-200/90 font-mono flex items-center gap-1.5 shrink-0 shadow-xs">
                      {getPlatformIcon(job.platform)}
                      <span>{job.platform}</span>
                    </span>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-sm sm:max-w-md">
                        {job.url}
                      </span>
                      {job.error && (
                        <span className="text-[11px] text-rose-600 font-mono truncate mt-0.5">
                          {job.error}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Pill & Time */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {job.created_at ? new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>

                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-mono font-bold ${
                        isRunning
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isQueued
                          ? 'bg-amber-100 text-amber-900'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      )}
                      {isDone && <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      {isFailed && <IconClose className="w-3.5 h-3.5 text-rose-600" />}
                      <span className="capitalize">{job.status}</span>
                    </div>
                  </div>
                </div>

                {/* If Running: Embedded Glowing Progress Bar */}
                {isRunning && (
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden relative shadow-inner">
                      <div className="h-full w-full bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 animate-stream-flow relative overflow-hidden rounded-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-beam" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-indigo-600">
                      <span>Extracting media streams...</span>
                      <span className="animate-pulse">Active</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
