'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { DownloadStudio } from '@/components/studio/DownloadStudio';
import { AutoSyncCard } from '@/components/studio/AutoSyncCard';
import { JobPipeline, JobRow, JobStats } from '@/components/studio/JobPipeline';
import { AdapterHealthDrawer } from '@/components/modals/AdapterHealthDrawer';
import { ArchiveImportModal } from '@/components/modals/ArchiveImportModal';
import { JobNotificationToast, CompletedJobNotice } from '@/components/studio/JobNotificationToast';
import { MediaLightboxModal, MediaItem } from '@/components/modals/MediaLightboxModal';
import Link from 'next/link';
import { apiError, apiFetch } from '@/lib/api';
import {
  IconVideoCamera,
  IconLayers,
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
        apiFetch(`${API}/jobs?status=active&limit=100`, { signal: AbortSignal.timeout(6000) }),
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
          const mediaHash = JSON.stringify(mediaData.map((m: MediaItem) => `${m.id}:${m.is_favorite}`));
          if (mediaHash !== lastMediaHashRef.current) {
            lastMediaHashRef.current = mediaHash;
            setRecentMedia(mediaData);
            setMediaCount(mediaData.length);
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
    const interval = setInterval(() => refreshData(false), 3000);
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
    <div className="linear-dark-bg min-h-[100dvh] text-slate-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-white overflow-x-hidden">
      
      {/* Top App Header (Stitch Comp) */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={mediaCount}
        activeJobsCount={activeJobsCount}
        queueStats={jobStats}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Studio Container */}
      <main className="flex-grow flex flex-col items-center w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-8 gap-10">
        
        {/* Status & Import Header Row */}
        <div className="w-full flex justify-between items-center max-w-4xl">
          {/* Live System Heartbeat Pill */}
          <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full hover:bg-slate-800/60 transition-colors cursor-default select-none border border-white/[0.08] shadow-2xs">
            <span className="relative flex h-2.5 w-2.5">
              {backendStatus === 'ok' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </>
              ) : backendStatus === 'loading' ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse" />
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              )}
            </span>
            <span className="text-xs text-slate-300 font-bold font-mono">
              {backendStatus === 'ok' ? 'System Online' : backendStatus === 'loading' ? 'Connecting...' : 'System Offline'}
            </span>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-panel text-slate-200 hover:bg-slate-800/80 hover:text-white border border-white/[0.08] hover:shadow-xs transition-all active:scale-95 text-xs font-bold cursor-pointer"
            >
              <IconUpload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => refreshData(true)}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center hover:bg-slate-800/80 text-slate-400 hover:text-white border border-white/[0.08] hover:shadow-xs hover:rotate-180 transition-all duration-500 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Sync library"
            >
              <IconRefresh className={`w-3.5 h-3.5 text-slate-300 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>


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
                const previewUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';
                const isVideo = firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));

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

            {/* Carousel Dots */}
            <div className="flex justify-center mt-2 gap-1.5">
              <div className="w-5 h-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></div>
              <div className="w-1.5 h-1 rounded-full bg-slate-700"></div>
              <div className="w-1.5 h-1 rounded-full bg-slate-700"></div>
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

      </main>

      {/* Footer (Shared Component) */}
      <footer className="glass-panel w-full py-6 mt-auto border-t-0 shadow-[0_-8px_32px_0_rgba(31,38,135,0.07)]">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 max-w-[1440px] mx-auto gap-4">
          <div className="font-medium text-xs tracking-wider text-slate-600 uppercase">
            © 2024 MediaVault Studio. All rights reserved.
          </div>
          <nav className="flex gap-6">
            <a className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors" href="#">Terms of Service</a>
            <a className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors" href="#">Privacy Policy</a>
            <a className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors" href="#">API Docs</a>
            <a className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors" href="#">Help Center</a>
          </nav>
        </div>
      </footer>

      {/* Lightbox Modal on Home */}
      <MediaLightboxModal
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />

      {/* Adapter Health Drawer */}
      <AdapterHealthDrawer
        isOpen={isAdaptersDrawerOpen}
        onClose={() => setIsAdaptersDrawerOpen(false)}
      />

      {/* Archive Import Modal */}
      <ArchiveImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => refreshData(true)}
      />

      {/* Job Completion Toast Notification */}
      <JobNotificationToast
        notice={completedNotice}
        onClose={() => setCompletedNotice(null)}
      />
    </div>
  );
}