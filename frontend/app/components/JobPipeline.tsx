'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconActivity,
  IconCheckCircle,
  IconClose,
  IconTrash,
  IconStop,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
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

export interface JobStats {
  total: number;
  queued: number;
  running: number;
  done: number;
  failed: number;
  dup: number;
  active_total: number;
  completed_total: number;
  progress_percent: number;
  cooldown?: {
    active: boolean;
    remaining: number;
    next_job_id: number | null;
    cooldown_seconds?: number;
  };
  running_jobs: Array<{
    id: number;
    platform: string;
    url: string;
    started_at: string | null;
  }>;
}

interface JobPipelineProps {
  jobs: JobRow[];
  stats?: JobStats | null;
  onCancelQueue?: () => Promise<void>;
  onClearJobs?: () => Promise<void>;
  onDeleteJob?: (id: number) => Promise<void>;
}

type StatusFilter = 'all' | 'active' | 'queued' | 'done' | 'failed';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

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

export function JobPipeline({ jobs, stats, onCancelQueue, onClearJobs, onDeleteJob }: JobPipelineProps) {
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCancelling, setIsCancelling] = useState(false);

  // Compute Queue Status
  const isQueueActive = stats ? stats.active_total > 0 : jobs.some((j) => j.status === 'running' || j.status === 'queued');
  const runningCount = stats ? stats.running : jobs.filter((j) => j.status === 'running').length;
  const queuedCount = stats ? stats.queued : jobs.filter((j) => j.status === 'queued').length;
  const completedCount = stats ? stats.done + stats.dup : jobs.filter((j) => j.status === 'done' || j.status === 'dup').length;
  const failedCount = stats ? stats.failed : jobs.filter((j) => j.status === 'failed').length;
  const totalCount = stats ? stats.total : jobs.length;
  const totalProcessed = stats ? stats.completed_total : completedCount + failedCount;
  const progressPercent = stats ? stats.progress_percent : Math.round((totalProcessed / (totalCount || 1)) * 100);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    if (statusFilter === 'all') return jobs;
    if (statusFilter === 'active') return jobs.filter((j) => j.status === 'running' || j.status === 'queued');
    if (statusFilter === 'queued') return jobs.filter((j) => j.status === 'queued');
    if (statusFilter === 'done') return jobs.filter((j) => j.status === 'done' || j.status === 'dup');
    if (statusFilter === 'failed') return jobs.filter((j) => j.status === 'failed');
    return jobs;
  }, [jobs, statusFilter]);

  // Pagination metrics
  const totalItems = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedJobs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, safeCurrentPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalItems);

  const handleCancelClick = async () => {
    if (!onCancelQueue) return;
    if (window.confirm('Are you sure you want to stop and cancel all pending downloads in queue?')) {
      setIsCancelling(true);
      try {
        await onCancelQueue();
      } finally {
        setIsCancelling(false);
      }
    }
  };

  if (jobs.length === 0 && (!stats || stats.total === 0)) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 flex flex-col gap-5">
      
      {/* 1. Prominent Live Queue Progress Dashboard (Visible when queue is active) */}
      {isQueueActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-white/95 backdrop-blur-xl border border-indigo-200/90 p-4 sm:p-5 shadow-[0_8px_30px_rgba(79,70,229,0.08)] flex flex-col gap-4"
        >
          {/* Top Status Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-[10px] bg-indigo-600 text-white shadow-md shadow-indigo-200 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-[10px] bg-indigo-400 opacity-60"></span>
                <IconDownload className="w-4 h-4 text-white relative z-10" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                    Processing Download Queue
                  </h3>
                </div>
              </div>
            </div>

            {/* Right: Metrics Chips & Stop Queue Button */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                  className={`px-2.5 py-1 rounded-[8px] border font-mono text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200/80 text-indigo-700'
                  }`}
                  title="Click to filter active tasks"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'active' ? 'bg-white' : 'bg-indigo-600'} animate-ping`} />
                  <span>{runningCount} Jobs Active</span>
                </button>

                {failedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
                    className={`px-2.5 py-1 rounded-[8px] border font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                      statusFilter === 'failed'
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-300'
                        : 'bg-rose-50 hover:bg-rose-100 border-rose-200/80 text-rose-800'
                    }`}
                    title="Click to filter failed tasks and inspect errors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'failed' ? 'bg-white' : 'bg-rose-500'}`} />
                    <span>{failedCount} Failed</span>
                  </button>
                )}
              </div>

              {/* Stop / Cancel Queue Button */}
              {onCancelQueue && (
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={isCancelling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/90 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                  title="Cancel and stop all pending jobs in queue"
                >
                  <IconStop className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isCancelling ? 'Stopping...' : 'Stop'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Precision Animated Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner p-0.5 border border-slate-200/80">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 rounded-full relative overflow-hidden transition-all duration-500"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-beam" />
              </motion.div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-0.5">
              <span>
                Progress: <strong className="text-slate-900 font-black">{totalProcessed} of {totalCount}</strong> processed ({progressPercent}%) • <strong className="text-emerald-700">{completedCount} done</strong>{failedCount > 0 ? `, ${failedCount} failed` : ''}
              </span>
              <span className="font-bold text-indigo-600">
                {queuedCount} tasks remaining
              </span>
            </div>
          </div>

          {/* Precision Interval / Cooldown Indicator */}
          <AnimatePresence>
            {stats?.cooldown?.active && stats.cooldown.remaining > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-[14px] bg-amber-50/90 border border-amber-200 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                      <IconClock className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-950 leading-none">
                        Interval Cooldown
                      </span>
                      <span className="text-[11px] font-mono text-amber-800 mt-0.5">
                        Next download in <strong className="font-black text-amber-950 tabular-nums">{stats.cooldown.remaining}s</strong> (Rate-limit delay)
                      </span>
                    </div>
                  </div>

                  {/* Live Mini Countdown Progress */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-2 bg-amber-200/80 rounded-full overflow-hidden p-0.5 border border-amber-300/50">
                      <motion.div
                        className="h-full bg-amber-500 rounded-full"
                        initial={false}
                        animate={{
                          width: `${Math.max(10, ((stats.cooldown.remaining) / (stats.cooldown.cooldown_seconds || 3)) * 100)}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-xs font-mono font-black text-amber-900 tabular-nums w-5 text-right">
                      {stats.cooldown.remaining}s
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 2. Pipeline Header & Filter Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <IconActivity className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Batch Import & Queue Pipeline
              </h2>
              <p className="text-[11px] font-mono text-slate-500">
                {totalCount} total tasks ({completedCount} done, {queuedCount} queued{failedCount > 0 ? `, ${failedCount} failed` : ''})
              </p>
            </div>
          </div>

          {onClearJobs && jobs.length > 0 && (
            <button
              type="button"
              onClick={onClearJobs}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Clear finished jobs from history"
            >
              <IconTrash className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Status Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Tasks', count: jobs.length },
            { id: 'active', label: 'Active', count: runningCount, color: 'text-indigo-700', badge: runningCount > 0 },
            { id: 'queued', label: 'Queued', count: queuedCount, color: 'text-amber-700' },
            { id: 'done', label: 'Done', count: completedCount, color: 'text-emerald-700' },
            { id: 'failed', label: 'Failed', count: failedCount, color: 'text-rose-700', badge: failedCount > 0 },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
                className={`relative px-3 py-1.5 rounded-[10px] text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-[5px] text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badge
                      ? tab.id === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Paginated Jobs List Container */}
      <div className="rounded-[22px] bg-white border border-slate-200/90 shadow-sm p-3.5 sm:p-4 flex flex-col gap-3 overflow-hidden">
        {totalItems === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <span className="text-sm font-semibold">No {statusFilter !== 'all' ? statusFilter : ''} tasks found</span>
            <span className="text-xs font-mono">Try switching filter tabs above</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {paginatedJobs.map((job) => {
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
                      : 'bg-rose-50/70 border-rose-300 shadow-xs'
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
                          <span className="text-[11px] text-rose-600 font-mono font-medium truncate mt-0.5">
                            ⚠️ {job.error}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Pill & Time & Actions */}
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

                      {/* Single Job Dismiss / Delete Button */}
                      {onDeleteJob && (
                        <button
                          type="button"
                          onClick={() => onDeleteJob(job.id)}
                          className="p-1 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Dismiss / Delete this job record"
                        >
                          <IconClose className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                        <span>Extracting media streams & metadata...</span>
                        <span className="animate-pulse">Active</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* 4. Pagination Controls Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-1">
            {/* Left: Range Counter */}
            <span className="text-xs font-mono font-semibold text-slate-500">
              Showing <strong className="text-slate-900 font-black">{startIndex}–{endIndex}</strong> of <strong className="text-slate-900 font-black">{totalItems}</strong> {statusFilter !== 'all' ? `(${statusFilter})` : 'tasks'}
            </span>

            {/* Center: Per Page Custom Choice (5, 10, 20) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                Per page:
              </span>
              <div className="relative flex items-center p-0.5 rounded-[10px] bg-slate-100/90 border border-slate-200/80">
                {PAGE_SIZE_OPTIONS.map((size) => {
                  const isSizeActive = pageSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      className={`relative px-2.5 py-0.5 rounded-[6px] text-xs font-mono font-bold transition-colors cursor-pointer ${
                        isSizeActive ? 'text-indigo-950 font-black' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isSizeActive && (
                        <motion.div
                          layoutId="job-pagesize-indicator"
                          className="absolute inset-0 bg-white rounded-[6px] shadow-xs -z-10"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                      )}
                      <span>{size}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Prev & Next Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <IconChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <span className="px-2.5 py-0.5 rounded-[6px] bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-black shadow-xs">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span className="hidden sm:inline">Next</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
