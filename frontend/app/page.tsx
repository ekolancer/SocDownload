'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadStudio } from './components/DownloadStudio';
import { JobPipeline, JobRow, JobStats } from './components/JobPipeline';
import { AdapterHealthDrawer } from './components/AdapterHealthDrawer';
import { ArchiveImportModal } from './components/ArchiveImportModal';
import { JobNotificationToast, CompletedJobNotice } from './components/JobNotificationToast';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function StudioPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [completedNotice, setCompletedNotice] = useState<CompletedJobNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevJobsRef = useRef<JobRow[]>([]);
  const notifiedJobIdsRef = useRef<Set<number>>(new Set());
  const isFetchingRef = useRef(false);

  const refreshData = useCallback(async (showIndicator = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showIndicator) setIsRefreshing(true);

    try {
      // Parallel fetch with individual timeouts so no single endpoint blocks the others
      const [healthResult, mediaResult, statsResult, jobsResult] = await Promise.allSettled([
        fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${API}/media?limit=500`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${API}/jobs/stats`, { signal: AbortSignal.timeout(4000) }),
        fetch(`${API}/jobs?limit=1000`, { signal: AbortSignal.timeout(6000) }),
      ]);

      // 1. Health check
      if (healthResult.status === 'fulfilled' && healthResult.value.ok) {
        setBackendStatus('ok');
      } else {
        setBackendStatus('offline');
      }

      // 2. Fetch Media Count
      if (mediaResult.status === 'fulfilled' && mediaResult.value.ok) {
        const mediaData = await mediaResult.value.json().catch(() => null);
        if (Array.isArray(mediaData)) {
          setMediaCount(mediaData.length);
        }
      }

      // 3. Fetch Jobs Stats
      if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
        const statsData: JobStats = await statsResult.value.json().catch(() => null);
        if (statsData) {
          setJobStats(statsData);
        }
      }

      // 4. Fetch Recent Jobs
      if (jobsResult.status === 'fulfilled' && jobsResult.value.ok) {
        const jobsData: JobRow[] = await jobsResult.value.json().catch(() => null);
        if (Array.isArray(jobsData)) {
          // Check if any job just completed from 'running' or 'queued' to 'done'
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
            // Initialize notified set with existing completed jobs so we only notify on new ones
            jobsData.forEach((j) => {
              if (j.status === 'done') notifiedJobIdsRef.current.add(j.id);
            });
          }

          prevJobsRef.current = jobsData;
          setJobs(jobsData);
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
    const interval = setInterval(() => refreshData(false), 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Handle Download Queueing
  const handleQueueDownload = async (url: string, platform?: string): Promise<boolean> => {
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
        return false;
      }

      await refreshData(true);
      return true;
    } catch (err) {
      console.error('Queue error:', err);
      alert('Could not connect to backend service');
      return false;
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
        {/* Download Hero Studio */}
        <DownloadStudio
          onQueueDownload={handleQueueDownload}
          isSubmitting={isSubmitting}
          activeJob={jobs.find((j) => j.status === 'running' || j.status === 'queued') || null}
        />

        {/* Live Job Pipeline & Activity Stream */}
        <JobPipeline
          jobs={jobs}
          stats={jobStats}
          onCancelQueue={handleCancelQueue}
          onClearJobs={handleClearJobs}
          onDeleteJob={handleDeleteJob}
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 py-8 mt-12 bg-white/70 backdrop-blur-md text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>MediaVault • High Fidelity Social Archiver</span>
          <span className="text-slate-400">
            Instagram • TikTok • Threads • YouTube • X • Reddit • Pinterest
          </span>
        </div>
      </footer>

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

      {/* Job Completion Toast Notification with Auto-Dismiss */}
      <JobNotificationToast
        notice={completedNotice}
        onClose={() => setCompletedNotice(null)}
      />
    </div>
  );
}