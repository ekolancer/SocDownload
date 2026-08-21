'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { MediaGallery } from '../components/MediaGallery';
import { MediaLightboxModal, MediaItem } from '../components/MediaLightboxModal';
import { AdapterHealthDrawer } from '../components/AdapterHealthDrawer';
import { ArchiveImportModal } from '../components/ArchiveImportModal';
import { JobRow } from '../components/JobPipeline';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function VaultPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [mediaError, setMediaError] = useState<string>('');

  // Modals state
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

      // 2. Fetch Media
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

      // 3. Fetch Jobs count
      const jobsRes = await fetch(`${API}/jobs?limit=20`).catch(() => null);
      if (jobsRes && jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
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

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => refreshData(false), 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const activeJobsCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="min-h-screen bg-[#EEF2F7] text-slate-800 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-800">
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

      {/* Main Vault Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]">
                Encrypted Local Archive
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mt-1">
              Personal Media Vault
            </h1>
          </div>

          <div className="text-xs font-mono text-slate-500 bg-[#E5EBF2] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] px-4 py-2 rounded-xl self-start sm:self-auto">
            Total Vault Items: <span className="font-bold text-indigo-600">{media.length}</span>
          </div>
        </div>

        {/* Media Gallery */}
        <MediaGallery
          media={media}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          onOpenLightbox={(item) => setLightboxItem(item)}
          error={mediaError}
        />
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
        onSuccess={() => refreshData(true)}
      />
    </div>
  );
}
