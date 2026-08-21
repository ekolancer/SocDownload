'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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

  // Parallax scroll hooks
  const { scrollY } = useScroll();
  const orbY1 = useTransform(scrollY, [0, 800], [0, 140]);
  const orbY2 = useTransform(scrollY, [0, 800], [0, -120]);

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
      params.set('limit', '500');
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
    <div className="relative min-h-screen bg-[#EEF2F7] text-slate-800 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-800 overflow-x-hidden">
      
      {/* Ambient Parallax Background Orbs */}
      <motion.div
        style={{ y: orbY1 }}
        className="pointer-events-none fixed top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-gradient-to-bl from-indigo-200/40 via-purple-200/20 to-transparent blur-3xl -z-10"
      />
      <motion.div
        style={{ y: orbY2 }}
        className="pointer-events-none fixed top-2/3 -left-32 w-[26rem] h-[26rem] rounded-full bg-gradient-to-tr from-teal-200/30 to-indigo-200/20 blur-3xl -z-10"
      />

      {/* Full-width Sticky Top Navbar */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={media.length}
        activeJobsCount={activeJobsCount}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Vault Container with airy whitespace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col gap-10">
        {/* Page Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]">
                Encrypted Local Archive
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
              Personal Media Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
              Explore your downloaded high-resolution albums, videos, captions, and source metadata.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-600 bg-[#E5EBF2] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] px-4 py-2.5 rounded-2xl self-start sm:self-auto border border-white/60">
            Total Vault Items: <span className="font-extrabold text-indigo-600 text-sm ml-1">{media.length}</span>
          </div>
        </motion.div>

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
      <footer className="w-full border-t border-slate-200/80 py-8 mt-16 bg-[#EEF2F7]/80 backdrop-blur-md text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
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
