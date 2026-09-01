'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DownloadStudio } from '@/components/studio/DownloadStudio';
import { AutoSyncCard } from '@/components/studio/AutoSyncCard';
import { JobPipeline, JobRow, JobStats } from '@/components/studio/JobPipeline';
import { ArchiveImportModal } from '@/components/modals/ArchiveImportModal';
import { JobNotificationToast, CompletedJobNotice } from '@/components/studio/JobNotificationToast';
import { MediaLightboxModal, MediaItem } from '@/components/modals/MediaLightboxModal';
import Link from 'next/link';
import { apiError, apiFetch } from '@/lib/api';
import {
  IconVideoCamera,
  IconRefresh,
  IconUpload,
} from '@/components/ui/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function StudioPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [importMode, setImportMode] = useState<'archive' | 'vidara' | null>(null);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [completedNotice, setCompletedNotice] = useState<CompletedJobNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevJobsRef = useRef<JobRow[]>([]);
  const notifiedJobIdsRef = useRef<Set<number>>(new Set());
  const isFetchingRef = useRef(false);
  // Dedup caches to skip re-render when polling returns identical data
  const lastMediaHashRef = useRef<string>('');
  const lastJobsHashRef = useRef<string>('');
  const lastJobStatsHashRef = useRef<string>('');

  const refreshData = useCallback(async (showIndicator = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showIndicator) setIsRefreshing(true);

    try {
      // Parallel fetch with individual timeouts
      const [healthResult, mediaResult, statsResult, jobsResult] = await Promise.allSettled([
        apiFetch(`${API}/health`, { signal: AbortSignal.timeout(4000) }),
        apiFetch(`${API}/media?limit=8`, { signal: AbortSignal.timeout(6000) }),
        apiFetch(`${API}/jobs/stats`, { signal: AbortSignal.timeout(4000) }),
        apiFetch(`${API}/jobs?limit=100`, { signal: AbortSignal.timeout(6000) }),
      ]);

      // 1. Health check
      if (healthResult.status === 'fulfilled' && healthResult.value.ok) {
        setBackendStatus('ok');
      } else {
        setBackendStatus('offline');
      }

      // 2. Fetch Media & Count
      if (mediaResult.status === 'fulfilled' && mediaResult.value.ok) {
        const mediaData = await mediaResult.value.json().catch(() => null);
        if (Array.isArray(mediaData)) {
          const mediaItems = mediaData
            .map((item: MediaItem) => ({
              ...item,
              files: (item.files || []).filter((file) => !/\.(m4a|mp3|wav|aac|flac|ogg)$/i.test(file.name || file.path || '')),
            }))
            .filter((item: MediaItem) => item.files.length > 0);
          const mediaHash = JSON.stringify(mediaItems.map((m: MediaItem) => `${m.id}:${m.is_favorite}`));
          if (mediaHash !== lastMediaHashRef.current) {
            lastMediaHashRef.current = mediaHash;
            setRecentMedia(mediaItems);
            setMediaCount(mediaItems.length);
          }
        }
      }

      // 3. Fetch Jobs Stats
      if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
        const statsData: JobStats = await statsResult.value.json().catch(() => null);
        if (statsData) {
          const statsHash = JSON.stringify(statsData);
          if (statsHash !== lastJobStatsHashRef.current) {
            lastJobStatsHashRef.current = statsHash;
            setJobStats(statsData);
          }
        }
      }

      // 4. Fetch Recent Jobs
      if (jobsResult.status === 'fulfilled' && jobsResult.value.ok) {
        const jobsData: JobRow[] = await jobsResult.value.json().catch(() => null);
        if (Array.isArray(jobsData)) {
          if (prevJobsRef.current.length > 0) {
            jobsData.forEach((newJob) => {
              const oldJob = prevJobsRef.current.find((j) => j.id === newJob.id);
              const wasInProgress = oldJob && (oldJob.status === 'running' || oldJob.status === 'queued');
              const isFinished = newJob.status === 'done' || newJob.status === 'dup' || newJob.status === 'failed';
              
              if (
                (wasInProgress || !notifiedJobIdsRef.current.has(newJob.id)) &&
                isFinished &&
                !notifiedJobIdsRef.current.has(newJob.id)
              ) {
                notifiedJobIdsRef.current.add(newJob.id);
                setCompletedNotice({
                  id: newJob.id,
                  platform: newJob.platform,
                  url: newJob.url,
                  status: newJob.status as 'done' | 'dup' | 'failed',
                  error: newJob.error,
                });
              }
            });
          } else {
            jobsData.forEach((j) => {
              if (j.status === 'done' || j.status === 'dup' || j.status === 'failed') {
                notifiedJobIdsRef.current.add(j.id);
              }
            });
          }


          prevJobsRef.current = jobsData;
          // Deduplicate: only update jobs state if data actually changed
          const jobsHash = JSON.stringify(jobsData.map((j: JobRow) => `${j.id}:${j.status}:${j.finished_at}`));
          if (jobsHash !== lastJobsHashRef.current) {
            lastJobsHashRef.current = jobsHash;
            setJobs(jobsData);
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      isFetchingRef.current = false;
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => refreshData(false), 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Handle Download Queueing (returns { success, jobId })
  const handleQueueDownload = async (url: string, platform?: string): Promise<{ success: boolean; jobId?: number }> => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || `Download request failed (${res.status})`);
        return { success: false };
      }

      const data = await res.json();
      await refreshData(true);
      return { success: true, jobId: data.id };
    } catch (err) {
      console.error('Queue error:', err);
      alert('Could not connect to backend service');
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel & Stop Active Queue
  const handleCancelQueue = async () => {
    try {
      const res = await apiFetch(`${API}/jobs/cancel-all`, { method: 'POST' });
      if (res.ok) {
        await refreshData(true);
      } else {
        alert(await apiError(res, 'Cancel queue failed'));
      }
    } catch (err) {
      alert('Could not connect to backend service');
    }
  };

  // Handle Delete Single Job
  const handleDeleteJob = async (jobId: number) => {
    try {
      const res = await apiFetch(`${API}/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshData(true);
      } else {
        alert(await apiError(res, 'Delete job failed'));
      }
    } catch (err) {
      alert('Could not connect to backend service');
    }
  };

  // Handle Clear Finished Jobs
  const handleClearJobs = async () => {
    try {
      const res = await apiFetch(`${API}/jobs`, { method: 'DELETE' });
      if (res.ok) {
        await refreshData(true);
      } else {
        alert(await apiError(res, 'Clear jobs failed'));
      }
    } catch (err) {
      alert('Could not connect to backend service');
    }
  };

  const activeJobsCount = jobStats ? jobStats.active_total : jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <DashboardShell
      title="Studio"
      description="High-performance media ingestion & archiving pipeline."
      actions={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportMode('archive')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <IconUpload className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Import Archive</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMode('vidara')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <IconUpload className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Import Vidara</span>
            <span className="sm:hidden">Vidara</span>
          </button>
          <button
            type="button"
            onClick={() => refreshData(true)}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-400/40 hover:bg-white/[0.05] hover:text-cyan-300 disabled:opacity-50"
            aria-label={isRefreshing ? 'Refreshing studio' : 'Refresh studio'}
            title="Refresh pipeline"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      )}
    >
      <div className="flex flex-col items-center w-full max-w-[1440px] mx-auto py-2 gap-8">
        {/* Hero Section */}
        <DownloadStudio
          onQueueDownload={handleQueueDownload}
          isSubmitting={isSubmitting}
          activeJob={jobs.find((j) => j.status === 'running' || j.status === 'queued') || null}
          jobs={jobs}
        />

        {/* Instagram Auto-Sync Automation Card */}
        <div className="w-full max-w-4xl">
          <AutoSyncCard
            onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
            onSyncComplete={() => refreshData(true)}
          />
        </div>

        {/* Recent Downloads Section */}
        {recentMedia.length > 0 && (
          <section className="w-full max-w-4xl flex flex-col gap-6">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">Recent Downloads</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                  8 LATEST
                </span>
              </div>
              <Link
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors flex items-center gap-1"
                href="/vault"
              >
                <span>View Full Vault</span>
                <span>→</span>
              </Link>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {recentMedia.slice(0, 4).map((item) => {
                const firstFile = item.files?.[0];
                const isVideo = firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));
                const previewUrl = firstFile ? (firstFile.thumbnail_url || `/media-file/${firstFile.id}`) : '';

                return (
                  <div
                    key={item.id}
                    onClick={() => setLightboxItem(item)}
                    className="rounded-2xl overflow-hidden glass-panel hover:bg-slate-800/80 transition-all duration-300 flex flex-col group p-1.5 shadow-md hover:shadow-xl hover:-translate-y-1 border border-white/[0.08] hover:border-white/20 cursor-pointer"
                  >
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-950 w-full border border-white/[0.04]">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={item.caption || 'Recent Media'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          width={firstFile?.width || 480}
                          height={firstFile?.height || 270}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                          No preview
                        </div>
                      )}

                      {/* Video indicator */}
                      {isVideo && (
                        <div className="absolute top-2 right-2 p-1 rounded-md bg-slate-950/80 border border-white/10 text-white backdrop-blur-xs">
                          <IconVideoCamera className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Multi-slide indicator */}
                      {item.files && item.files.length > 1 && (
                        <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-white text-[9px] font-mono font-bold backdrop-blur-xs">
                          +{item.files.length}
                        </div>
                      )}
                    </div>

                    {/* Author Bottom Bar */}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                          {item.username ? item.username.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <span className="text-xs text-white font-bold truncate group-hover:text-emerald-400 transition-colors">
                          {item.username ? `@${item.username}` : 'Archived'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        {item.platform}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Batch Import & Queue Pipeline */}
        <JobPipeline
          jobs={jobs}
          stats={jobStats}
          onCancelQueue={handleCancelQueue}
          onClearJobs={handleClearJobs}
          onDeleteJob={handleDeleteJob}
        />
      </div>

      {/* Lightbox Modal on Home */}
      <MediaLightboxModal
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />

      {/* Archive Import Modal */}
      <ArchiveImportModal
        isOpen={importMode !== null}
        onClose={() => setImportMode(null)}
        onSuccess={() => refreshData(true)}
        mode={importMode || 'archive'}
      />

      {/* Job Completion Toast Notification */}
      <JobNotificationToast
        notice={completedNotice}
        onClose={() => setCompletedNotice(null)}
      />
    </DashboardShell>
  );
}