'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadStudio } from './components/DownloadStudio';
import { JobPipeline, JobRow } from './components/JobPipeline';
import { JobNotificationToast, JobNotification } from './components/JobNotificationToast';
import { AdapterHealthDrawer } from './components/AdapterHealthDrawer';
import { ArchiveImportModal } from './components/ArchiveImportModal';
import { MediaItem } from './components/MediaLightboxModal';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [mediaCount, setMediaCount] = useState<number>(0);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [latestNotification, setLatestNotification] = useState<JobNotification | null>(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep track of previous jobs to trigger pop-up animations on completion
  const prevJobStatusMap = useRef<Record<number, string>>({});
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

      // 2. Fetch Jobs
      const jobsRes = await fetch(`${API}/jobs?limit=50`).catch(() => null);
      if (jobsRes && jobsRes.ok) {
        const jobsData: JobRow[] = await jobsRes.json();
        setJobs(jobsData);

        // Check for newly completed or failed jobs to trigger popup notification
        jobsData.forEach((j) => {
          const prev = prevJobStatusMap.current[j.id];
          if (prev && (prev === 'queued' || prev === 'running')) {
            if (j.status === 'done' || j.status === 'failed' || j.status === 'dup') {
              setLatestNotification({
                id: j.id,
                platform: j.platform,
                url: j.url,
                status: j.status,
                error: j.error || undefined,
              });
            }
          }
          prevJobStatusMap.current[j.id] = j.status;
        });
      }

      // 3. Fetch Media count
      const mediaRes = await fetch(`${API}/media?limit=1`).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const mediaData: MediaItem[] = await mediaRes.json();
        // Also fetch total media count
        const allMediaRes = await fetch(`${API}/media?limit=500`).catch(() => null);
        if (allMediaRes && allMediaRes.ok) {
          const allMedia = await allMediaRes.json();
          setMediaCount(allMedia.length);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      isFetchingRef.current = false;
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  // Initial fetch and 2-second background heartbeat
  useEffect(() => {
    refreshData();
    const interval = setInterval(() => refreshData(false), 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Handle URL download submission
  const handleDownload = async (targetUrl: string): Promise<boolean> => {
    if (!targetUrl.trim() || submitting) return false;
    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Backend returned status ${response.status}`);
      }

      // Refresh immediately
      await refreshData(true);
      return true;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to enqueue download job');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Clear Job Queue Action
  const handleClearJobs = async () => {
    try {
      const res = await fetch(`${API}/jobs`, { method: 'DELETE' });
      if (res.ok) {
        prevJobStatusMap.current = {};
        await refreshData(true);
      }
    } catch (err) {
      console.error('Error clearing jobs:', err);
    }
  };

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const activeJobStatus = activeJobs.length > 0 ? (activeJobs[0].status as 'running' | 'queued') : null;

  return (
    <div className="min-h-screen bg-[#EEF2F7] text-slate-800 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-800">
      {/* Top Navbar Header */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={mediaCount}
        activeJobsCount={activeJobs.length}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
        {/* Hero Ingestion Studio with Real-time Progress Bar */}
        <DownloadStudio
          onDownload={handleDownload}
          submitting={submitting}
          submitError={submitError}
          onClearError={() => setSubmitError('')}
          activeJobStatus={activeJobStatus}
        />

        {/* Activity & Job Pipeline Queue */}
        <JobPipeline jobs={jobs} onClearJobs={handleClearJobs} />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 py-6 mt-12 bg-[#EEF2F7] text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediaVault • Personal Self-Hosted Archiver</span>
          <span className="text-slate-400">
            Instagram • TikTok • X • YouTube • Reddit • Pinterest • Threads
          </span>
        </div>
      </footer>

      {/* Animated Job Result Pop-up Toast */}
      <JobNotificationToast
        notification={latestNotification}
        onDismiss={() => setLatestNotification(null)}
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
        onSuccess={() => {
          refreshData(true);
        }}
      />
    </div>
  );
}