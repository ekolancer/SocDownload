'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DownloadStudio } from './components/DownloadStudio';
import { MediaGallery } from './components/MediaGallery';
import { MediaLightboxModal, MediaItem } from './components/MediaLightboxModal';
import { JobPipeline, JobRow } from './components/JobPipeline';
import { AdapterHealthDrawer } from './components/AdapterHealthDrawer';
import { ArchiveImportModal } from './components/ArchiveImportModal';
import { IconLayers, IconActivity } from './components/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';
type ActiveViewTab = 'vault' | 'activity';

const API = '/api';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('vault');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [mediaError, setMediaError] = useState<string>('');

  // Modals state
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Polling guard
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
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }

      // 3. Fetch Media
      const params = new URLSearchParams();
      params.set('limit', '120');
      const mediaRes = await fetch(`${API}/media?${params.toString()}`).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMedia(mediaData);
        setMediaError('');
      } else {
        setMediaError('Could not sync media library');
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

  const activeJobsCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="min-h-screen bg-[#08090D] text-[#EDEDF2] flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar Header */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={media.length}
        activeJobsCount={activeJobsCount}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Hero Ingestion Studio */}
        <DownloadStudio
          onDownload={handleDownload}
          submitting={submitting}
          submitError={submitError}
          onClearError={() => setSubmitError('')}
        />

        {/* View Switcher Tabs (Media Vault vs Activity Pipeline) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#12141F] border border-white/5">
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <IconLayers className="w-4 h-4" />
              <span>Media Library</span>
              <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono">
                {media.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <IconActivity className="w-4 h-4" />
              <span>Jobs & Queue</span>
              {activeJobsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono animate-pulse">
                  {activeJobsCount}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Encrypted At-Rest</span>
            <span>•</span>
            <span>Local Vault</span>
          </div>
        </div>

        {/* Dynamic Content Views */}
        {activeTab === 'vault' ? (
          <MediaGallery
            media={media}
            selectedPlatform={selectedPlatform}
            onSelectPlatform={setSelectedPlatform}
            onOpenLightbox={(item) => setLightboxItem(item)}
            error={mediaError}
          />
        ) : (
          <JobPipeline jobs={jobs} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 mt-12 bg-[#06070B] text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediaVault • Personal Self-Hosted Archiver</span>
          <span className="text-slate-400">
            Instagram • Threads • X • TikTok • YouTube • Reddit • Pinterest
          </span>
        </div>
      </footer>

      {/* Lightbox Modal */}
      <MediaLightboxModal item={lightboxItem} onClose={() => setLightboxItem(null)} />

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
          setActiveTab('activity');
        }}
      />
    </div>
  );
}