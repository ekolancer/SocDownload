'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadStudio } from './components/DownloadStudio';
import { JobPipeline, JobRow } from './components/JobPipeline';
import { AdapterHealthDrawer } from './components/AdapterHealthDrawer';
import { ArchiveImportModal } from './components/ArchiveImportModal';
import { JobNotificationToast, CompletedJobNotice } from './components/JobNotificationToast';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function StudioPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [jobs, setJobs] = useState<JobRow[]>([]);
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
      // 1. Health check
      const healthRes = await fetch(`${API}/health`).catch(() => null);
      if (healthRes && healthRes.ok) {
        setBackendStatus('ok');
      } else {
        setBackendStatus('offline');
      }

      // 2. Fetch Media Count
      const mediaRes = await fetch(`${API}/media?limit=500`).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMediaCount(mediaData.length);
      }

      // 3. Fetch Jobs
      const jobsRes = await fetch(`${API}/jobs?limit=20`).catch(() => null);
      if (jobsRes && jobsRes.ok) {
        const jobsData: JobRow[] = await jobsRes.json();

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
    const interval = setInterval(() => refreshData(false), 2500);
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

  // Handle Clear Finished Jobs
  const handleClearJobs = async () => {
    try {
      const res = await fetch(`${API}/jobs/clear`, { method: 'POST' });
      if (res.ok) {
        refreshData(true);
      }
    } catch (err) {
      console.error('Clear jobs error:', err);
    }
  };

  const activeJobsCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Top App Bar */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={mediaCount}
        activeJobsCount={activeJobsCount}
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
          onClearJobs={handleClearJobs}
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