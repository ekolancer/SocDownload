'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconActivity,
  IconCheckCircle,
  IconClose,
  IconTrash,
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

export function JobPipeline({ jobs, onClearJobs }: JobPipelineProps) {
  if (jobs.length === 0) return null;

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const finishedJobs = jobs.filter((j) => j.status === 'done' || j.status === 'failed' || j.status === 'dup');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
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
            onClick={onClearJobs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
          >
            <IconTrash className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Jobs List Container: M3 Surface Container */}
      <div className="rounded-3xl bg-white border border-slate-200/80 m3-elevation-1 p-3 sm:p-4 flex flex-col gap-2.5 overflow-hidden">
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
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                  isRunning
                    ? 'bg-sky-50/70 border-sky-200/80'
                    : isQueued
                    ? 'bg-amber-50/60 border-amber-200/80'
                    : isDone
                    ? 'bg-slate-50/70 border-slate-200/60'
                    : 'bg-rose-50/70 border-rose-200/80'
                }`}
              >
                {/* Left: Platform, URL, and Status */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-white text-slate-700 border border-slate-200 font-mono shrink-0">
                    {job.platform}
                  </span>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-sm sm:max-w-md">
                      {job.url}
                    </span>
                    {job.error && (
                      <span className="text-[11px] text-rose-600 font-mono truncate">
                        {job.error}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Tonal Status Badge */}
                <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {job.created_at ? new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>

                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isRunning
                        ? 'bg-sky-100 text-sky-800'
                        : isQueued
                        ? 'bg-amber-100 text-amber-800'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isRunning && (
                      <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
                    )}
                    {isDone && <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    {isFailed && <IconClose className="w-3.5 h-3.5 text-rose-600" />}
                    <span className="capitalize">{job.status}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
