'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getVisiblePages } from '@/lib/pagination';
import {
  IconClose,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconDownload,
  IconFilter,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/ui/Icons';

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

type StatusFilter = 'all' | 'active' | 'instagram' | 'tiktok' | 'threads' | 'x' | 'youtube';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <IconInstagram className="w-5 h-5 text-slate-400 group-hover:text-pink-400 transition-colors" />;
    case 'tiktok':
      return <IconTikTok className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />;
    case 'threads':
      return <IconThreads className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />;
    case 'youtube':
      return <IconYouTube className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" />;
    case 'x':
    case 'twitter':
      return <IconX className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />;
    case 'reddit':
      return <IconReddit className="w-5 h-5 text-orange-500 group-hover:text-orange-400 transition-colors" />;
    case 'pinterest':
      return <IconPinterest className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" />;
    default:
      return <IconDownload className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />;
  }
}

function formatJobTime(dateString?: string | null) {
  if (!dateString) return '--:--';
  try {
    let str = dateString;
    if (!str.includes('Z') && !str.includes('+') && !/\d{2}-\d{2}$/.test(str)) {
      str = str + 'Z';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      const fallback = new Date(dateString);
      return fallback.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace('.', ':');
    }
    return d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace('.', ':');
  } catch {
    return '--:--';
  }
}

export function JobPipeline({ jobs, stats, onCancelQueue, onClearJobs, onDeleteJob }: JobPipelineProps) {
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Compute Queue Status
  const isQueueActive = stats ? stats.active_total > 0 : jobs.some((j) => j.status === 'running' || j.status === 'queued');
  const activeCount = stats ? stats.active_total : jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;
  const totalCount = stats ? stats.total : jobs.length;

  const threadsCount = jobs.filter((j) => j.platform?.toLowerCase() === 'threads').length;
  const xCount = jobs.filter((j) => j.platform?.toLowerCase() === 'x' || j.platform?.toLowerCase() === 'twitter').length;
  const igCount = jobs.filter((j) => j.platform?.toLowerCase() === 'instagram').length;

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Filter by tab
    if (statusFilter === 'active') {
      result = result.filter((j) => j.status === 'running' || j.status === 'queued');
    } else if (statusFilter !== 'all') {
      result = result.filter((j) => {
        const p = j.platform?.toLowerCase();
        if (statusFilter === 'x') return p === 'x' || p === 'twitter';
        return p === statusFilter;
      });
    }

    // Filter by search query
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim();
      result = result.filter(
        (j) => j.url.toLowerCase().includes(q) || j.platform.toLowerCase().includes(q)
      );
    }

    return result;
  }, [jobs, statusFilter, searchKeyword]);

  // Pagination metrics
  const totalItems = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchKeyword, pageSize]);

  const paginatedJobs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, safeCurrentPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalItems);
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);

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
    <section className="w-full max-w-4xl flex flex-col gap-6 mt-8">
      
      {/* Section Header */}
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Batch Import &amp; Queue Pipeline
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Monitor real-time download tasks, auto-sync queues, and ingest status.
          </p>
        </div>

        {onClearJobs && (
          <button
            type="button"
            onClick={onClearJobs}
            className="px-4 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all active:scale-95 text-xs font-semibold cursor-pointer shrink-0"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Active Queue Banner if Running */}
      {isQueueActive && (
        <div className="rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Pipeline Ingesting ({stats ? stats.running : 1} Active)
              </span>
            </div>
            {onCancelQueue && (
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={isCancelling}
                className="px-3 py-1 rounded-lg text-xs font-bold text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-600 border border-rose-500/30 transition-colors cursor-pointer"
              >
                {isCancelling ? 'Stopping...' : 'Stop Queue'}
              </button>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950/80 border border-white/[0.05] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${stats ? stats.progress_percent : 50}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats & Filters Row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* All Tasks */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'bg-slate-900/60 text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>All Tasks</span>
            <span className="opacity-70 ml-1 font-bold">{totalCount}</span>
          </button>

          {/* Active */}
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'bg-slate-900/60 text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Active</span>
            <span className="opacity-70 ml-1">{activeCount}</span>
          </button>

          {/* Threads */}
          <button
            type="button"
            onClick={() => setStatusFilter('threads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              statusFilter === 'threads'
                ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'bg-slate-900/60 text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Threads</span>
            <span className="opacity-70 ml-1">{threadsCount}</span>
          </button>

          {/* X (Twitter) */}
          <button
            type="button"
            onClick={() => setStatusFilter('x')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              statusFilter === 'x'
                ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'bg-slate-900/60 text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>X (Twitter)</span>
            <span className="opacity-70 ml-1">{xCount}</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={() => setStatusFilter('instagram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
              statusFilter === 'instagram'
                ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                : 'bg-slate-900/60 text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Instagram</span>
            <span className="opacity-70 ml-1">{igCount}</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-3">
          <div className="flex-grow relative group">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              aria-label="Search tasks"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search for all Tasks..."
              className="w-full bg-slate-950/60 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all focus:outline-none text-sm font-medium"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <IconFilter className="w-4 h-4 text-slate-400" />
              <span>Filters</span>
              <span className="text-[10px]">▼</span>
            </button>

            {isFilterDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsFilterDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-30 flex flex-col gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-left rounded-lg hover:bg-slate-800 font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    All Platforms
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('active');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-left rounded-lg hover:bg-slate-800 font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Active Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('instagram');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-left rounded-lg hover:bg-slate-800 font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('tiktok');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-left rounded-lg hover:bg-slate-800 font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    TikTok
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('threads');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-left rounded-lg hover:bg-slate-800 font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Threads
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('x');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-left rounded-lg hover:bg-slate-800 font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    X (Twitter)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2.5">
        {paginatedJobs.map((job) => {
          const isDone = job.status === 'done' || job.status === 'dup';
          const isRunning = job.status === 'running';
          const isQueued = job.status === 'queued';
          const isFailed = job.status === 'failed';

          return (
            <div
              key={job.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/[0.08] hover:border-white/20 transition-all duration-300 group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Left */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-950/60 border border-white/[0.06] flex items-center justify-center shadow-sm shrink-0">
                  {getPlatformIcon(job.platform)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white group-hover:text-emerald-400 transition-colors capitalize text-sm">
                    {job.platform}
                  </span>
                  <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] md:max-w-md" title={job.url}>
                    {job.url}
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                <span className="text-slate-400 text-xs font-mono hidden sm:inline">
                  {formatJobTime(job.created_at)}
                </span>

                {isDone ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shadow-sm cursor-default">
                    <span className="text-sm font-bold">✓</span>
                    <span className="font-bold text-[10px] uppercase tracking-wider">Done</span>
                  </div>
                ) : isRunning ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span className="font-bold text-[10px] uppercase tracking-wider">Running</span>
                  </div>
                ) : isQueued ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400 shadow-sm">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Queued</span>
                  </div>
                ) : isFailed ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400 shadow-sm">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Failed</span>
                  </div>
                ) : null}

                {onDeleteJob && (
                  <button
                    type="button"
                    onClick={() => onDeleteJob(job.id)}
                    className="text-rose-200 hover:text-white hover:bg-rose-950/40 p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                    title="Remove task"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination & Metrics Bar */}
      {totalItems > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-white/[0.08]">
          
          {/* Left: Summary Metrics Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-xs text-slate-300 font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Showing <strong className="font-bold text-white">{startIndex}-{endIndex}</strong> of <strong className="font-bold text-white">{totalItems}</strong> tasks
            </span>
          </div>

          {/* Center: Smart Windowed Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Previous Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-200 active:scale-95 shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Previous Page"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>

              {/* Number Buttons inside Capsule */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-white/[0.08] rounded-xl shadow-2xs">
                {visiblePages.map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold text-slate-500 select-none font-mono"
                      >
                        •••
                      </span>
                    );
                  }

                  const pageNum = Number(page);
                  const isActive = pageNum === safeCurrentPage;

                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                        isActive
                          ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10 scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-200 active:scale-95 shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Next Page"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right: Custom Per-Page Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-xs text-slate-300 font-medium shadow-2xs">
            <span className="text-slate-400 font-medium">Per page:</span>
            <div className="flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </section>
  );
}
