'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadStudio } from './components/DownloadStudio';
import { JobPipeline, JobRow, JobStats } from './components/JobPipeline';
import { AdapterHealthDrawer } from './components/AdapterHealthDrawer';
import { ArchiveImportModal } from './components/ArchiveImportModal';
import { JobNotificationToast, CompletedJobNotice } from './components/JobNotificationToast';
import { MediaLightboxModal, MediaItem } from './components/MediaLightboxModal';
import Link from 'next/link';
import {
  IconFolder,
  IconVideoCamera,
  IconLayers,
  IconSparkles,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
} from './components/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <IconInstagram className="w-3 h-3 text-pink-600" />;
    case 'tiktok':
      return <IconTikTok className="w-3 h-3 text-slate-900" />;
    case 'threads':
      return <IconThreads className="w-3 h-3 text-slate-900" />;
    case 'youtube':
      return <IconYouTube className="w-3 h-3 text-red-600" />;
    case 'x':
    case 'twitter':
      return <IconX className="w-3 h-3 text-slate-900" />;
    case 'reddit':
      return <IconReddit className="w-3 h-3 text-orange-600" />;
    case 'pinterest':
      return <IconPinterest className="w-3 h-3 text-red-600" />;
    default:
      return <IconSparkles className="w-3 h-3 text-indigo-600" />;
  }
}

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
        fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${API}/media?limit=8`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${API}/jobs/stats`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${API}/jobs?limit=1000`, { signal: AbortSignal.timeout(6000) }),
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
              
              if (
                (wasInProgress || !notifiedJobIdsRef.current.has(newJob.id)) &&
                newJob.status === 'done' &&
                !notifiedJobIdsRef.current.has(newJob.id)
              ) {
                notifiedJobIdsRef.current.add(newJob.id);
                setCompletedNotice({
                  id: newJob.id,
                  platform: newJob.platform,
                  url: newJob.url,
                });
              }
            });
          } else {
            jobsData.forEach((j) => {
              if (j.status === 'done') notifiedJobIdsRef.current.add(j.id);
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
      const res = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Download request failed');
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
      const res = await fetch(`${API}/jobs/cancel-all`, { method: 'POST' });
      if (res.ok) {
        await refreshData(true);
      }
    } catch (err) {
      console.error('Cancel queue error:', err);
    }
  };

  // Handle Delete Single Job
  const handleDeleteJob = async (jobId: number) => {
    try {
      const res = await fetch(`${API}/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshData(true);
      }
    } catch (err) {
      console.error('Delete job error:', err);
    }
  };

  // Handle Clear Finished Jobs
  const handleClearJobs = async () => {
    try {
      const res = await fetch(`${API}/jobs`, { method: 'DELETE' });
      if (res.ok) {
        await refreshData(true);
      }
    } catch (err) {
      console.error('Clear jobs error:', err);
    }
  };

  const activeJobsCount = jobStats ? jobStats.active_total : jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Top App Bar */}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-10">
        {/* Single URL Download Hero Studio */}
        <DownloadStudio
          onQueueDownload={handleQueueDownload}
          isSubmitting={isSubmitting}
          activeJob={jobs.find((j) => j.status === 'running' || j.status === 'queued') || null}
        />

        {/* Recent Downloads Carousel Strip */}
        {recentMedia.length > 0 && (
          <div className="w-full max-w-4xl mx-auto px-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                  Recent Downloads
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold">
                  {recentMedia.length} latest
                </span>
              </div>

              <Link
                href="/vault"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
              >
                <span>View Full Vault</span>
                <span>→</span>
              </Link>
            </div>

            {/* Horizontal Scroll Strip */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
              {recentMedia.map((item) => {
                const firstFile = item.files?.[0];
                const previewUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';
                const isVideo = firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));

                return (
                  <div
                    key={item.id}
                    onClick={() => setLightboxItem(item)}
                    className="group relative flex flex-col w-36 sm:w-40 rounded-[16px] bg-white border border-slate-200/90 hover:border-indigo-300 p-1.5 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 shrink-0 select-none"
                  >
                    {/* Thumbnail Canvas */}
                    <div className="relative aspect-[4/5] w-full rounded-[12px] bg-slate-950 overflow-hidden flex items-center justify-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={item.caption || 'Recent Media'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">No preview</span>
                      )}

                      {/* Video indicator */}
                      {isVideo && (
                        <div className="absolute top-2 right-2 p-1 rounded-[6px] bg-slate-900/80 text-emerald-400 backdrop-blur-sm">
                          <IconVideoCamera className="w-3 h-3" />
                        </div>
                      )}

                      {/* Multi-slide indicator */}
                      {item.files && item.files.length > 1 && (
                        <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-[6px] bg-slate-900/80 text-white text-[9px] font-mono font-bold backdrop-blur-sm">
                          <IconLayers className="w-2.5 h-2.5" />
                          <span>{item.files.length}</span>
                        </div>
                      )}

                      {/* Platform Tag */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-white/95 text-slate-800 text-[9px] font-bold shadow-xs">
                        {getPlatformIcon(item.platform)}
                        <span className="capitalize">{item.platform}</span>
                      </div>
                    </div>

                    {/* Bottom Author Tag */}
                    <div className="px-1 py-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {item.username ? `@${item.username}` : 'Archived'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Batch Import & Background Queue Pipeline */}
        <JobPipeline
          jobs={jobs}
          stats={jobStats}
          onCancelQueue={handleCancelQueue}
          onClearJobs={handleClearJobs}
          onDeleteJob={handleDeleteJob}
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 py-8 mt-12 bg-white text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>MediaVault • High Fidelity Social Archiver</span>
          <span className="text-slate-400">
            Instagram • TikTok • Threads • YouTube • X • Reddit • Pinterest
          </span>
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