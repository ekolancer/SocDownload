'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { MediaGallery } from '@/components/vault/MediaGallery';
import { CreatorsHub, CreatorStats } from '@/components/vault/CreatorsHub';
import { BatchActionBar } from '@/components/vault/BatchActionBar';
import { MediaLightboxModal, MediaItem } from '@/components/modals/MediaLightboxModal';
import { AlbumModal } from '@/components/modals/AlbumModal';
import { AdapterHealthDrawer } from '@/components/modals/AdapterHealthDrawer';
import { ArchiveImportModal } from '@/components/modals/ArchiveImportModal';
import { JobNotificationToast, CompletedJobNotice } from '@/components/studio/JobNotificationToast';
import { JobRow, JobStats } from '@/components/studio/JobPipeline';
import { AlbumSummary } from '@/components/vault/VaultSidebar';
import { apiError, apiFetch } from '@/lib/api';
import {
  IconLayers,
  IconFolderPlus,
  IconPencil,
  IconTrash,
  IconPhoto,
  IconStar,
  IconStarFilled,
  IconSparkles,
  IconUsers,
  IconDownload,
  IconFolderZip,
  IconCheck,
  IconSearch,
  IconClose,
  IconRefresh,
  IconUpload,
  IconVideoCamera,
  IconInstagram,
  IconTikTok,
  IconX,
  IconThreads,
} from '@/components/ui/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';
export type VaultTab = 'photos' | 'explore' | 'albums' | 'favorites';
export type MediaTypeFilter = 'all' | 'video' | 'photo';

const API = '/api';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: IconInstagram },
  { id: 'tiktok', label: 'TikTok', icon: IconTikTok },
  { id: 'x', label: 'X', icon: IconX },
  { id: 'threads', label: 'Threads', icon: IconThreads },
];

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    previousValue.current = value;

    if (startValue === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();
    const duration = 1400;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function VaultPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [creatorsList, setCreatorsList] = useState<CreatorStats[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [storageStats, setStorageStats] = useState<{ total_bytes: number; total_files: number; human_size: string } | null>(null);

  // Navigation & View States
  const [currentTab, setCurrentTab] = useState<VaultTab>('photos');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSummary | null>(null);
  const [albumDetailItems, setAlbumDetailItems] = useState<MediaItem[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');

  // Multi-Selection States
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Modals & Notifications
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumModalMode, setAlbumModalMode] = useState<'create_only' | 'add_to_album' | 'edit'>('create_only');
  const [editingAlbum, setEditingAlbum] = useState<{ id: number; name: string; description?: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [completedNotice, setCompletedNotice] = useState<CompletedJobNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevJobsRef = useRef<JobRow[]>([]);
  const isFetchingRef = useRef(false);
  const lastMediaHashRef = useRef<string>('');
  const lastAlbumsHashRef = useRef<string>('');
  const lastCreatorsHashRef = useRef<string>('');

  // Fetch & Synchronize Library Data
  const refreshData = useCallback(async (showIndicator = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showIndicator) setIsRefreshing(true);

    try {
      // 1. Health check
      const healthRes = await apiFetch(`${API}/health`).catch(() => null);
      if (healthRes && healthRes.ok) {
        setBackendStatus('ok');
      } else {
        setBackendStatus('offline');
      }

      // 2. Fetch Media Library
      const mediaRes = await apiFetch(`${API}/media?limit=1500`).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const mediaHash = JSON.stringify(mediaData.map((m: MediaItem) => `${m.id}:${m.is_favorite}:${m.created_at}`));
        if (mediaHash !== lastMediaHashRef.current) {
          lastMediaHashRef.current = mediaHash;
          setMedia(mediaData);
        }
      }

      // 3. Fetch Albums
      const albumsRes = await apiFetch(`${API}/albums`).catch(() => null);
      if (albumsRes && albumsRes.ok) {
        const albumsData = await albumsRes.json();
        const albumsHash = JSON.stringify(albumsData.map((a: AlbumSummary) => `${a.id}:${a.name}:${a.items_count}`));
        if (albumsHash !== lastAlbumsHashRef.current) {
          lastAlbumsHashRef.current = albumsHash;
          setAlbums(albumsData);
        }
      }

      // 4. Fetch Creators Aggregation
      const creatorsRes = await apiFetch(`${API}/media/creators`).catch(() => null);
      if (creatorsRes && creatorsRes.ok) {
        const creatorsData = await creatorsRes.json();
        const creatorsHash = JSON.stringify(creatorsData);
        if (creatorsHash !== lastCreatorsHashRef.current) {
          lastCreatorsHashRef.current = creatorsHash;
          setCreatorsList(creatorsData);
        }
      }

      // 5. Fetch Job Stats
      const statsRes = await apiFetch(`${API}/jobs/stats`).catch(() => null);
      if (statsRes && statsRes.ok) {
        const statsData: JobStats = await statsRes.json();
        setJobStats(statsData);
      }

      // 6. Fetch Active Jobs & trigger completion toast
      const jobsRes = await apiFetch(`${API}/jobs?limit=20`).catch(() => null);
      if (jobsRes && jobsRes.ok) {
        const jobsData: JobRow[] = await jobsRes.json();

        if (prevJobsRef.current.length > 0) {
          const newlyFinished = jobsData.filter((curr) => {
            const prev = prevJobsRef.current.find((p) => p.id === curr.id);
            return prev && (prev.status === 'running' || prev.status === 'queued') && (curr.status === 'done' || curr.status === 'dup' || curr.status === 'failed');
          });

          if (newlyFinished.length > 0) {
            const first = newlyFinished[0];
            setCompletedNotice({
              id: first.id,
              platform: first.platform || 'media',
              url: first.url,
              status: first.status as 'done' | 'dup' | 'failed',
              error: first.error,
            });
          }
        }
        prevJobsRef.current = jobsData;
        setJobs(jobsData);
      }

      // 7. Fetch Storage Usage Stats
      const storageRes = await apiFetch(`${API}/media/storage`).catch(() => null);
      if (storageRes && storageRes.ok) {
        const sData = await storageRes.json();
        setStorageStats(sData);
      }
    } catch (err) {
      console.error('Vault polling failed:', err);
    } finally {
      isFetchingRef.current = false;
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  }, []);

  // Fetch single album items when viewing album details
  const fetchAlbumDetail = useCallback(async (albumId: number) => {
    try {
      const res = await apiFetch(`${API}/albums/${albumId}`);
      if (res.ok) {
        const data = await res.json();
        setAlbumDetailItems(data.items || []);
      }
    } catch (err) {
      console.error('Fetch album detail failed:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedAlbum) {
      fetchAlbumDetail(selectedAlbum.id);
    }
  }, [selectedAlbum, fetchAlbumDetail]);

  // Initial load & background polling
  useEffect(() => {
    refreshData(false);
    const interval = setInterval(() => refreshData(false), 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Keyboard shortcut: Esc to clear multi-selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.length > 0) {
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.length]);

  // Platform Filter Toggle
  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  // Base items depending on view mode
  const currentBaseMedia = useMemo(() => {
    if (selectedAlbum) return albumDetailItems;
    if (selectedCreator) {
      return media.filter((m) => m.username?.toLowerCase() === selectedCreator.toLowerCase());
    }
    if (currentTab === 'favorites') {
      return media.filter((m) => m.is_favorite);
    }
    return media;
  }, [media, selectedAlbum, albumDetailItems, selectedCreator, currentTab]);

  // Filtered & Searched media items
  const displayMedia = useMemo(() => {
    let result = [...currentBaseMedia];

    // Platform filter
    if (selectedPlatforms.length > 0) {
      result = result.filter((m) => selectedPlatforms.includes(m.platform?.toLowerCase()));
    }

    // Media Type filter (video vs photo)
    if (mediaTypeFilter === 'video') {
      result = result.filter((m) => m.files?.some((f) => f.kind === 'video' || Boolean(f.path?.endsWith('.mp4'))));
    } else if (mediaTypeFilter === 'photo') {
      result = result.filter((m) => m.files?.some((f) => f.kind === 'image' && !f.path?.endsWith('.mp4')));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.caption?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.source_url?.toLowerCase().includes(q) ||
          m.platform?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [currentBaseMedia, selectedPlatforms, mediaTypeFilter, searchQuery]);

  // Multi-Selection Handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    setSelectedIds(displayMedia.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Single Item Handlers
  const handleDeleteItem = async (id: number) => {
    try {
      const res = await apiFetch(`${API}/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        if (lightboxItem?.id === id) setLightboxItem(null);
        refreshData(false);
      }
    } catch (err) {
      console.error('Delete item failed:', err);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      const res = await apiFetch(`${API}/media/${id}/favorite`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_favorite: data.is_favorite } : m))
        );
        if (lightboxItem && lightboxItem.id === id) {
          setLightboxItem((prev) => prev ? { ...prev, is_favorite: data.is_favorite } : null);
        }
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    }
  };

  // Batch Handlers
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} media terpilih secara permanen dari vault?`)) return;

    setIsBatchProcessing(true);
    try {
      const res = await apiFetch(`${API}/media/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
       if (!res.ok) {
         throw new Error(await apiError(res, 'Batch delete failed'));
       }
       if (res.ok) {
         setMedia((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
        setSelectedIds([]);
        refreshData(false);
      }
     } catch (err) {
       alert(err instanceof Error ? err.message : 'Batch delete failed');
     } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await apiFetch(`${API}/media/batch/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediavault-batch-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Batch download zip failed:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleToggleFavoriteBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          apiFetch(`${API}/media/${id}/favorite`, { method: 'PATCH' })
        )
      );
      refreshData(false);
    } catch (err) {
      console.error('Batch favorite toggle failed:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleRemoveFromAlbum = async () => {
    if (!selectedAlbum || selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await apiFetch(`${API}/albums/${selectedAlbum.id}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchAlbumDetail(selectedAlbum.id);
        refreshData(false);
      }
    } catch (err) {
      console.error('Remove from album failed:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleOpenAddToAlbum = () => {
    setAlbumModalMode('add_to_album');
    setIsAlbumModalOpen(true);
  };

  const handleOpenCreateAlbum = () => {
    setEditingAlbum(null);
    setAlbumModalMode('create_only');
    setIsAlbumModalOpen(true);
  };

  const handleCreateAlbum = async (name: string, description?: string): Promise<number | null> => {
    try {
      const res = await apiFetch(`${API}/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const data = await res.json();
        refreshData(false);
        return data.id;
      }
    } catch (err) {
      console.error('Create album failed:', err);
    }
    return null;
  };

  const handleUpdateAlbum = async (albumId: number, name: string, description?: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API}/albums/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        refreshData(false);
        return true;
      }
    } catch (err) {
      console.error('Update album failed:', err);
    }
    return false;
  };

  const handleAddItemsToAlbum = async (albumId: number, mediaIds: number[]): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API}/albums/${albumId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: mediaIds }),
      });
      if (res.ok) {
        refreshData(false);
        if (selectedAlbum?.id === albumId) fetchAlbumDetail(albumId);
        return true;
      }
    } catch (err) {
      console.error('Add items to album failed:', err);
    }
    return false;
  };

  const handleDeleteAlbum = async (albumId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus album ini? (Media di dalamnya tetap tersimpan di Vault)')) return;
    try {
      const res = await apiFetch(`${API}/albums/${albumId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
        refreshData(false);
      }
    } catch (err) {
      console.error('Delete album failed:', err);
    }
  };

  // Video and Image count metrics
  const videoCount = useMemo(() => {
    return media.filter((m) => m.files?.some((f) => f.kind === 'video' || Boolean(f.path?.endsWith('.mp4')))).length;
  }, [media]);

  const photoCount = useMemo(() => {
    return media.length - videoCount;
  }, [media.length, videoCount]);

  const activeJobsCount = jobStats ? jobStats.active_total : jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="linear-dark-bg min-h-screen text-white flex flex-col antialiased selection:bg-emerald-500/30 selection:text-white overflow-x-hidden">
      
      {/* 1. Top Application Header (Shared Navbar) */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={media.length}
        activeJobsCount={activeJobsCount}
        queueStats={jobStats}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* 2. Main Vault Dashboard Container */}
      <main className="flex-grow flex flex-col items-center w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-8 gap-8">
        
        {/* Status & Quick Action Header Row */}
        <div className="w-full flex justify-between items-center max-w-7xl">
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
              {backendStatus === 'ok' ? 'Vault Asset Center Online' : backendStatus === 'loading' ? 'Connecting...' : 'Vault Offline'}
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-panel text-slate-200 hover:bg-slate-800/80 hover:text-white border border-white/[0.08] hover:shadow-xs transition-all active:scale-95 text-xs font-bold cursor-pointer"
            >
              <IconUpload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import Archive</span>
            </button>

            <button
              type="button"
              onClick={() => refreshData(true)}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center hover:bg-slate-800/80 text-slate-400 hover:text-white border border-white/[0.08] hover:shadow-xs hover:rotate-180 transition-all duration-500 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Perbarui data library"
            >
              <IconRefresh className={`w-3.5 h-3.5 text-slate-300 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. 4-Column Bento Metric Ribbon (SaaS Telemetry) */}
        <section className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Aset Media */}
          <div className="p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <div className="p-5 rounded-xl bg-slate-950/50 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Total Aset Media
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 border border-white/10 flex items-center justify-center shadow-2xs">
                  <IconPhoto className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono tracking-tight text-white">
                  <AnimatedNumber value={media.length} />
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-400">
                  <span>{photoCount} Foto</span>
                  <span>•</span>
                  <span>{videoCount} Video</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Kapasitas Penyimpanan */}
          <div className="p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <div className="p-5 rounded-xl bg-slate-950/50 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Penyimpanan Disk
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-teal-400 border border-white/10 flex items-center justify-center shadow-2xs">
                  <IconDownload className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono tracking-tight text-white">
                  {storageStats?.human_size || '0 MB'}
                </span>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  <AnimatedNumber value={storageStats?.total_files || 0} /> file
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 border border-white/5 overflow-hidden shadow-inner mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 rounded-full shadow-xs"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          storageStats?.total_bytes
                            ? (storageStats.total_bytes / (5 * 1024 * 1024 * 1024)) * 100
                            : (media.length / 500) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Discovery Kreator */}
          <div
            onClick={() => {
              setCurrentTab('explore');
              setSelectedCreator(null);
              setSelectedAlbum(null);
            }}
            className="p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-xl transition-all cursor-pointer backdrop-blur-md group"
          >
            <div className="p-5 rounded-xl bg-slate-950/50 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Kreator & Akun
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-indigo-400 border border-white/10 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                  <IconUsers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono tracking-tight text-white">
                  <AnimatedNumber value={creatorsList.length} />
                </span>
                <span className="text-[11px] font-bold text-emerald-400 block mt-1 group-hover:underline">
                  Jelajahi Profil Kreator →
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Koleksi & Album */}
          <div className="p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <div className="p-5 rounded-xl bg-slate-950/50 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Album Kustom
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreateAlbum}
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="Buat Album Baru"
                >
                  <IconFolderPlus className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold font-mono tracking-tight text-white">
                    <AnimatedNumber value={albums.length} />
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 block mt-1">
                    Koleksi Album
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('albums');
                    setSelectedAlbum(null);
                    setSelectedCreator(null);
                  }}
                  className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  Lihat Semua →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Universal SaaS Command & Filter Island */}
        <section className="w-full max-w-7xl p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-2xl backdrop-blur-xl flex flex-col gap-3">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-950/50 border border-white/[0.06] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Left: View Tabs Switcher (Segmented Control) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/[0.08] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setCurrentTab('photos');
                  setSelectedCreator(null);
                  setSelectedAlbum(null);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  currentTab === 'photos' && !selectedAlbum && !selectedCreator
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconPhoto className="w-3.5 h-3.5" />
                <span>Foto & Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentTab('explore');
                  setSelectedCreator(null);
                  setSelectedAlbum(null);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  currentTab === 'explore' && !selectedCreator
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconUsers className="w-3.5 h-3.5" />
                <span>Kreator ({creatorsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentTab('albums');
                  setSelectedAlbum(null);
                  setSelectedCreator(null);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  currentTab === 'albums' && !selectedAlbum
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconLayers className="w-3.5 h-3.5" />
                <span>Album ({albums.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentTab('favorites');
                  setSelectedCreator(null);
                  setSelectedAlbum(null);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  currentTab === 'favorites'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconStar className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Favorit</span>
              </button>
            </div>

            {/* Center & Right: Omni-Search & Media Type Filters */}
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
              {/* Omni Search Bar */}
              <div className="relative flex-1 w-full">
                <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari caption, kreator (@username), platform..."
                  className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-900/80 border border-white/[0.08] focus:border-emerald-500/40 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <IconClose className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Media Type Filter (All / Video / Photo) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === 'all'
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter('video')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === 'video'
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <IconVideoCamera className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter('photo')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === 'photo'
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <IconPhoto className="w-3.5 h-3.5" />
                  <span>Foto</span>
                </button>
              </div>
            </div>
          </div>

          {/* Platform Filter Pills Row */}
          <div className="flex items-center gap-2 px-3 pb-1 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Platform:
            </span>
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPlatforms.includes(p.id);
              const count = media.filter((m) => m.platform?.toLowerCase() === p.id).length;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                    isSelected
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-900/60 text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                  <span className="opacity-70 font-normal">({count})</span>
                </button>
              );
            })}
            {selectedPlatforms.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPlatforms([])}
                className="text-[11px] font-mono text-emerald-400 hover:underline shrink-0 cursor-pointer ml-1"
              >
                Reset Filter
              </button>
            )}
          </div>
        </section>

        {/* 5. Dynamic Content Views */}
        <section className="w-full max-w-7xl">
          {/* VIEW: Creators Hub Tab */}
          {currentTab === 'explore' && !selectedCreator && (
            <CreatorsHub
              creators={creatorsList}
              loading={false}
              onSelectCreator={(username) => {
                setSelectedCreator(username);
                setCurrentTab('photos');
              }}
            />
          )}

          {/* VIEW: Custom Albums Tab */}
          {currentTab === 'albums' && !selectedAlbum && (
            <div className="flex flex-col gap-6">
              {/* Header & Create Button */}
              <div className="p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-xl backdrop-blur-xl">
                <div className="p-5 rounded-xl bg-slate-950/50 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Album &amp; Koleksi Kustom
                    </h2>
                    <span className="text-xs text-slate-400 font-medium">
                      Kelola dan kelompokkan aset media vault Anda ke dalam album kustom
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCreateAlbum}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition-all shadow-md shadow-white/10 cursor-pointer active:scale-95"
                  >
                    <IconFolderPlus className="w-4 h-4" />
                    <span>Buat Album Baru</span>
                  </button>
                </div>
              </div>

              {/* Album Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Create New Album Tile Card */}
                <button
                  type="button"
                  onClick={handleOpenCreateAlbum}
                  className="group p-1.5 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-emerald-400 hover:bg-slate-900/80 transition-all cursor-pointer aspect-square shadow-sm flex flex-col"
                >
                  <div className="w-full h-full rounded-xl flex flex-col items-center justify-center p-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                      <IconFolderPlus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                      Album Baru
                    </span>
                  </div>
                </button>

                {/* Album Items */}
                {albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => setSelectedAlbum(album)}
                    className="group relative p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer aspect-square flex flex-col backdrop-blur-md"
                  >
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-white/[0.06] flex flex-col justify-between h-full">
                      {/* Stacked Cover Image Frame */}
                      <div className="w-full flex-1 rounded-lg overflow-hidden bg-slate-950 relative border border-white/5">
                        {album.cover_file_url ? (
                          <img
                            src={
                              album.cover_file_url.startsWith('http') || album.cover_file_url.startsWith('/api')
                                ? album.cover_file_url
                                : `/media-files/${album.cover_file_url}`
                            }
                            alt={album.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <IconLayers className="w-8 h-8" />
                          </div>
                        )}
                        
                        {/* Count Badge */}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white font-mono text-[10px] font-bold border border-white/10">
                          {album.items_count} media
                        </span>
                      </div>

                      {/* Title & Delete Action */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-bold text-xs text-white truncate tracking-tight">
                          {album.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAlbum(album.id, e)}
                          className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus album"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: Media Gallery (Photos / Favorites / Album Detail / Creator Archive) */}
          {((currentTab === 'photos' || currentTab === 'favorites') || selectedAlbum || selectedCreator) && (
            <MediaGallery
              media={displayMedia}
              onOpenLightbox={(item) => setLightboxItem(item)}
              onDeleteItem={handleDeleteItem}
              onToggleFavorite={handleToggleFavorite}
              onSelectCreator={(username) => {
                setSelectedCreator(username);
                setCurrentTab('photos');
              }}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              viewTitle={
                selectedAlbum
                  ? `Album: ${selectedAlbum.name}`
                  : selectedCreator
                  ? `Kreator: @${selectedCreator}`
                  : currentTab === 'favorites'
                  ? 'Koleksi Favorit Bintang'
                  : undefined
              }
              onBackToTimeline={
                selectedAlbum || selectedCreator
                  ? () => {
                      setSelectedAlbum(null);
                      setSelectedCreator(null);
                    }
                  : undefined
              }
            />
          )}
        </section>
      </main>

      {/* 6. Floating Glass Batch Action Bar (Agency Double-Bezel Island) */}
      <BatchActionBar
        selectedIds={selectedIds}
        totalCount={displayMedia.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onAddToAlbum={handleOpenAddToAlbum}
        onRemoveFromAlbum={selectedAlbum ? handleRemoveFromAlbum : undefined}
        onToggleFavoriteBatch={handleToggleFavoriteBatch}
        onDownloadZipBatch={handleBatchDownloadZip}
        onDeleteBatch={handleBatchDelete}
        isProcessing={isBatchProcessing}
      />

      {/* 7. Lightbox Modal */}
      {lightboxItem && (
        <MediaLightboxModal
          item={lightboxItem}
          onClose={() => setLightboxItem(null)}
          onDelete={handleDeleteItem}
          onSelectCreator={(username) => {
            setSelectedCreator(username);
            setCurrentTab('photos');
          }}
        />
      )}

      {/* 8. Album Creation / Add Modal */}
      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        mode={albumModalMode}
        albums={albums}
        selectedMediaIds={selectedIds}
        initialData={editingAlbum}
        onCreateAlbum={handleCreateAlbum}
        onUpdateAlbum={handleUpdateAlbum}
        onAddItemsToAlbum={handleAddItemsToAlbum}
      />

      {/* 9. Archive Ingestion Modal */}
      <ArchiveImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => refreshData(true)}
      />

      {/* 10. Adapters & Health Drawer */}
      <AdapterHealthDrawer
        isOpen={isAdaptersDrawerOpen}
        onClose={() => setIsAdaptersDrawerOpen(false)}
      />

      {/* 11. Toast Notifications */}
      {completedNotice && (
        <JobNotificationToast
          notice={completedNotice}
          onClose={() => setCompletedNotice(null)}
        />
      )}

    </div>
  );
}
