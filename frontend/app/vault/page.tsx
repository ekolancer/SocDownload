'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { MediaGallery } from '../components/MediaGallery';
import { MediaLightboxModal, MediaItem } from '../components/MediaLightboxModal';
import {
  VaultSidebar,
  VaultViewMode,
  AlbumSummary,
  CreatorSummary,
  SUPPORTED_PLATFORMS,
} from '../components/VaultSidebar';
import { BatchActionBar } from '../components/BatchActionBar';
import { AlbumModal } from '../components/AlbumModal';
import { AdapterHealthDrawer } from '../components/AdapterHealthDrawer';
import { ArchiveImportModal } from '../components/ArchiveImportModal';
import { CreatorsHub, CreatorStats } from '../components/CreatorsHub';
import { JobNotificationToast, CompletedJobNotice } from '../components/JobNotificationToast';
import { JobRow, JobStats } from '../components/JobPipeline';
import Link from 'next/link';
import {
  IconFolder,
  IconFolderPlus,
  IconUser,
  IconUsers,
  IconLayers,
  IconDownload,
  IconFileText,
  IconFolderZip,
  IconStar,
  IconSparkles,
} from '../components/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function VaultPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [creatorsList, setCreatorsList] = useState<CreatorStats[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [mediaError, setMediaError] = useState<string>('');

  // Navigation, Multi-Select Platform Filter & Slide-Over Sidebar State
  const [currentView, setCurrentView] = useState<VaultViewMode>({ type: 'timeline' });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [albumDetailItems, setAlbumDetailItems] = useState<MediaItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Modals & Notifications state
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumModalMode, setAlbumModalMode] = useState<'create_only' | 'add_to_album'>('create_only');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [completedNotice, setCompletedNotice] = useState<CompletedJobNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevJobsRef = useRef<JobRow[]>([]);
  const isFetchingRef = useRef(false);

  // Refresh Data
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
      const mediaRes = await fetch(`${API}/media?limit=1000`).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMedia(mediaData);
        setMediaError('');
      } else {
        setMediaError('Could not sync media library');
      }

      // 3. Fetch Albums
      const albumsRes = await fetch(`${API}/albums`).catch(() => null);
      if (albumsRes && albumsRes.ok) {
        const albumsData = await albumsRes.json();
        setAlbums(albumsData);
      }

      // 4. Fetch Creators Aggregation
      const creatorsRes = await fetch(`${API}/media/creators`).catch(() => null);
      if (creatorsRes && creatorsRes.ok) {
        const creatorsData = await creatorsRes.json();
        setCreatorsList(creatorsData);
      }

      // 5. Fetch Job Stats
      const statsRes = await fetch(`${API}/jobs/stats`).catch(() => null);
      if (statsRes && statsRes.ok) {
        const statsData: JobStats = await statsRes.json();
        setJobStats(statsData);
      }

      // 5. Fetch Jobs & trigger completion toast
      const jobsRes = await fetch(`${API}/jobs?limit=20`).catch(() => null);
      if (jobsRes && jobsRes.ok) {
        const jobsData: JobRow[] = await jobsRes.json();

        if (prevJobsRef.current.length > 0) {
          jobsData.forEach((newJob) => {
            const oldJob = prevJobsRef.current.find((j) => j.id === newJob.id);
            if (oldJob && (oldJob.status === 'running' || oldJob.status === 'queued') && newJob.status === 'done') {
              setCompletedNotice({
                id: newJob.id,
                platform: newJob.platform,
                url: newJob.url,
              });
            }
          });
        }

        prevJobsRef.current = jobsData;
        setJobs(jobsData);
      }
    } catch (err) {
      console.error('Fetch error in Vault:', err);
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

  // Fetch Album Detail when view is album_detail
  useEffect(() => {
    if (currentView.type === 'album_detail') {
      fetch(`${API}/albums/${currentView.albumId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.items) {
            setAlbumDetailItems(data.items);
          }
        })
        .catch(console.error);
    }
  }, [currentView]);

  // Platform Counts Mapping
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SUPPORTED_PLATFORMS.forEach((p) => {
      counts[p.id] = 0;
    });
    media.forEach((item) => {
      const p = item.platform?.toLowerCase();
      if (counts[p] !== undefined) {
        counts[p] += 1;
      } else if (p === 'twitter') {
        counts['x'] = (counts['x'] || 0) + 1;
      }
    });
    return counts;
  }, [media]);

  // Compute Creators Summary
  const creators = useMemo(() => {
    const map = new Map<string, { count: number; platforms: Set<string> }>();
    media.forEach((item) => {
      const u = item.username ? item.username.trim() : 'Anonymous';
      if (!map.has(u)) {
        map.set(u, { count: 0, platforms: new Set() });
      }
      const entry = map.get(u)!;
      entry.count += 1;
      entry.platforms.add(item.platform);
    });

    const list: CreatorSummary[] = [];
    map.forEach((val, username) => {
      list.push({
        username,
        count: val.count,
        platforms: Array.from(val.platforms),
      });
    });
    return list.sort((a, b) => b.count - a.count);
  }, [media]);

  // Favorites count
  const favoritesCount = useMemo(() => {
    return media.filter((m) => m.is_favorite).length;
  }, [media]);

  // Determine active media list with Platform Multi-Selection filtering
  const displayMedia = useMemo(() => {
    let baseMedia: MediaItem[] = [];

    switch (currentView.type) {
      case 'timeline':
        baseMedia = media;
        break;
      case 'favorites':
        baseMedia = media.filter((m) => m.is_favorite);
        break;
      case 'album_detail':
        baseMedia = albumDetailItems;
        break;
      case 'creator_detail':
        baseMedia = media.filter((m) => (m.username || 'Anonymous') === currentView.username);
        break;
      case 'type_filter':
        if (currentView.kind === 'photo') {
          baseMedia = media.filter(
            (m) =>
              m.files?.some((f) => f.kind === 'image') &&
              !m.files?.some((f) => f.path?.endsWith('.txt'))
          );
        } else if (currentView.kind === 'video') {
          baseMedia = media.filter((m) =>
            m.files?.some((f) => f.kind === 'video' || f.path?.endsWith('.mp4'))
          );
        } else if (currentView.kind === 'threads') {
          baseMedia = media.filter(
            (m) => m.platform === 'threads' || m.files?.some((f) => f.path?.endsWith('.txt'))
          );
        } else {
          baseMedia = media;
        }
        break;
      default:
        baseMedia = media;
        break;
    }

    // Apply Multi-Select Platform Filters if any platforms are selected
    if (selectedPlatforms.length > 0) {
      baseMedia = baseMedia.filter((m) => {
        const p = m.platform?.toLowerCase();
        return (
          selectedPlatforms.includes(p) ||
          (p === 'twitter' && selectedPlatforms.includes('x'))
        );
      });
    }

    return baseMedia;
  }, [currentView, media, albumDetailItems, selectedPlatforms]);

  // Platform Multi-Select Handlers
  const handleTogglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSelectAllPlatforms = () => {
    setSelectedPlatforms(SUPPORTED_PLATFORMS.map((p) => p.id));
  };

  const handleClearPlatforms = () => {
    setSelectedPlatforms([]);
  };

  // Multi-Selection handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeselectAll = () => setSelectedIds([]);

  // Single Item Handlers
  const handleDeleteMedia = async (id: number) => {
    try {
      const res = await fetch(`${API}/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setAlbumDetailItems((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        if (lightboxItem?.id === id) setLightboxItem(null);
        refreshData(true);
      } else {
        alert('Failed to delete media');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      const res = await fetch(`${API}/media/${id}/favorite`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_favorite: data.is_favorite } : m))
        );
        setAlbumDetailItems((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_favorite: data.is_favorite } : m))
        );
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  // Batch Handlers
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Hapus permanen ${selectedIds.length} item dari vault dan harddisk?`)) {
      setIsBatchProcessing(true);
      try {
        const res = await fetch(`${API}/media/batch-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_ids: selectedIds }),
        });
        if (res.ok) {
          const removed = new Set(selectedIds);
          setMedia((prev) => prev.filter((m) => !removed.has(m.id)));
          setAlbumDetailItems((prev) => prev.filter((m) => !removed.has(m.id)));
          setSelectedIds([]);
          refreshData(true);
        }
      } catch (err) {
        console.error('Batch delete error:', err);
      } finally {
        setIsBatchProcessing(false);
      }
    }
  };

  const handleBatchToggleFavorite = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API}/media/${id}/favorite`, { method: 'PATCH' })
        )
      );
      setSelectedIds([]);
      await refreshData(true);
    } catch (err) {
      console.error('Batch favorite error:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch(`${API}/media/batch-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediavault_export_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Batch zip error:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDownloadCsv = () => {
    if (selectedIds.length === 0) return;
    const idsParam = selectedIds.join(',');
    window.location.href = `${API}/media/export/csv?ids=${idsParam}`;
  };

  // Album CRUD handlers
  const handleCreateAlbum = async (name: string, description?: string): Promise<number | null> => {
    try {
      const res = await fetch(`${API}/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const newAlbum = await res.json();
        await refreshData(true);
        return newAlbum.id;
      }
    } catch (err) {
      console.error('Create album error:', err);
    }
    return null;
  };

  const handleAddItemsToAlbum = async (albumId: number, mediaIds: number[]): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/albums/${albumId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: mediaIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        await refreshData(true);
        return true;
      }
    } catch (err) {
      console.error('Add items to album error:', err);
    }
    return false;
  };

  const activeJobsCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Top App Bar */}
      <Navbar
        backendStatus={backendStatus}
        mediaCount={media.length}
        activeJobsCount={jobStats ? jobStats.active_total : activeJobsCount}
        queueStats={jobStats}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Spacious Workspace Layout */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Live Queue Active Notice on Vault Page */}
        {jobStats && jobStats.active_total > 0 && (
          <div className="w-full rounded-[20px] bg-white/95 backdrop-blur-xl border border-indigo-200/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-[10px] bg-indigo-600 text-white shrink-0 shadow-xs">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-[10px] bg-indigo-400 opacity-60"></span>
                <IconDownload className="w-4 h-4 text-white relative z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900">
                    Background Ingestion Running:
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-600">
                    {jobStats.running} active • {jobStats.queued} remaining ({jobStats.progress_percent}%)
                  </span>
                </div>
                <div className="h-1.5 w-48 sm:w-64 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, jobStats.progress_percent)}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer shrink-0 border border-indigo-200/80"
            >
              <span>Open Queue →</span>
            </Link>
          </div>
        )}

        {/* Top Vault Sub-Nav Bar & Export Menu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'timeline' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-extrabold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
                currentView.type === 'timeline'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <IconLayers className="w-3.5 h-3.5" />
              <span>All Media</span>
              <span className="opacity-70">({media.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'creators_list' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-extrabold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
                currentView.type === 'creators_list' || currentView.type === 'creator_detail'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <IconUsers className="w-3.5 h-3.5" />
              <span>Creators Hub</span>
              <span className="opacity-70">({creatorsList.length || creators.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'albums_list' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-extrabold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
                currentView.type === 'albums_list' || currentView.type === 'album_detail'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <IconFolder className="w-3.5 h-3.5" />
              <span>Albums</span>
              <span className="opacity-70">({albums.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'favorites' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-extrabold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
                currentView.type === 'favorites'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <IconStar className="w-3.5 h-3.5 text-amber-500" />
              <span>Favorites</span>
              <span className="opacity-70">({favoritesCount})</span>
            </button>
          </div>

          {/* Right Action: Filters Drawer + Export Vault Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto relative">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer"
              title="Open Filter Drawer"
            >
              <IconLayers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filters</span>
              {selectedPlatforms.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 shadow-2xs transition-all cursor-pointer"
                title="Export entire vault or filtered view"
              >
                <IconDownload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Export Vault</span>
                <span className="text-[10px]">▼</span>
              </button>

              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-60 rounded-[16px] bg-white border border-slate-200 shadow-xl p-1.5 z-30 flex flex-col gap-1">
                    <a
                      href={`/api/media/export/zip${
                        currentView.type === 'creator_detail'
                          ? `?username=${encodeURIComponent(currentView.username)}`
                          : currentView.type === 'album_detail'
                          ? `?album_id=${currentView.albumId}`
                          : selectedPlatforms.length === 1
                          ? `?platform=${selectedPlatforms[0]}`
                          : ''
                      }`}
                      download
                      onClick={() => setIsExportMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <IconFolderZip className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold">Full Package (ZIP)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Media files + metadata</span>
                      </div>
                    </a>

                    <a
                      href={`/api/media/export/csv${
                        currentView.type === 'creator_detail'
                          ? `?username=${encodeURIComponent(currentView.username)}`
                          : currentView.type === 'album_detail'
                          ? `?album_id=${currentView.albumId}`
                          : selectedPlatforms.length === 1
                          ? `?platform=${selectedPlatforms[0]}`
                          : ''
                      }`}
                      download
                      onClick={() => setIsExportMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      <IconFileText className="w-4 h-4 text-sky-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold">Metadata (CSV / Excel)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Lightweight tabular data</span>
                      </div>
                    </a>

                    <a
                      href={`/api/media/export/json${
                        currentView.type === 'creator_detail'
                          ? `?username=${encodeURIComponent(currentView.username)}`
                          : currentView.type === 'album_detail'
                          ? `?album_id=${currentView.albumId}`
                          : selectedPlatforms.length === 1
                          ? `?platform=${selectedPlatforms[0]}`
                          : ''
                      }`}
                      download
                      onClick={() => setIsExportMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    >
                      <IconSparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold">Metadata (JSON)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Full developer JSON export</span>
                      </div>
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* If View is Creators List Hub */}
        {currentView.type === 'creators_list' ? (
          <CreatorsHub
            creators={creatorsList}
            loading={loadingCreators}
            onSelectCreator={(username) => {
              setCurrentView({ type: 'creator_detail', username });
            }}
          />
        ) : currentView.type === 'albums_list' ? (
          /* If View is Albums List Hub */
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Albums</h1>
                <p className="text-xs text-slate-500 font-normal">
                  Custom collections and categorized media
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAlbumModalMode('create_only');
                    setIsAlbumModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm transition-all cursor-pointer"
                >
                  <IconFolderPlus className="w-4 h-4" />
                  <span>New Album</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {albums.map((a) => (
                <div
                  key={a.id}
                  onClick={() =>
                    setCurrentView({
                      type: 'album_detail',
                      albumId: a.id,
                      albumName: a.name,
                    })
                  }
                  className="group rounded-[18px] bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-md p-3.5 flex flex-col gap-3 cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  <div className="relative aspect-video w-full rounded-[12px] bg-slate-900 overflow-hidden flex items-center justify-center text-slate-400">
                    {a.cover_file_url ? (
                      <img
                        src={a.cover_file_url}
                        alt={a.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <IconFolder className="w-10 h-10 text-slate-400" />
                    )}
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-bold bg-slate-900/80 text-white backdrop-blur-md border border-white/10">
                      {a.items_count} items
                    </span>
                  </div>

                  <div className="flex flex-col px-0.5">
                    <span className="text-sm font-extrabold text-slate-900">{a.name}</span>
                    {a.description && (
                      <span className="text-xs text-slate-400 truncate mt-0.5">{a.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Default Gallery View with Slideover Toggle */
          <MediaGallery
            media={displayMedia}
            onOpenLightbox={(item) => setLightboxItem(item)}
            onDeleteItem={handleDeleteMedia}
            onToggleFavorite={handleToggleFavorite}
            onSelectCreator={(username) => setCurrentView({ type: 'creator_detail', username })}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSidebar={() => setIsSidebarOpen(true)}
            activePlatformsCount={selectedPlatforms.length}
            viewTitle={
              currentView.type === 'album_detail'
                ? `📁 ${currentView.albumName}`
                : currentView.type === 'creator_detail'
                ? `👤 @${currentView.username}'s Archive`
                : currentView.type === 'favorites'
                ? '⭐ Starred Favorites'
                : currentView.type === 'type_filter'
                ? `🎬 ${currentView.kind.toUpperCase()} Archive`
                : selectedPlatforms.length > 0
                ? `Filtered (${selectedPlatforms.join(', ')})`
                : 'Media Vault'
            }
            viewSubtitle={
              selectedPlatforms.length > 0
                ? `Showing media from ${selectedPlatforms.join(', ')}`
                : currentView.type === 'album_detail'
                ? 'Custom Album Collection'
                : currentView.type === 'creator_detail'
                ? 'Media downloaded from this author'
                : undefined
            }
            onBackToTimeline={
              currentView.type === 'creator_detail'
                ? () => setCurrentView({ type: 'creators_list' })
                : currentView.type === 'album_detail'
                ? () => setCurrentView({ type: 'albums_list' })
                : currentView.type !== 'timeline'
                ? () => setCurrentView({ type: 'timeline' })
                : undefined
            }
            error={mediaError}
          />
        )}

      </div>

      {/* Slide-Over Drawer Panel */}
      <VaultSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setSelectedIds([]);
        }}
        totalMediaCount={media.length}
        favoritesCount={favoritesCount}
        albums={albums}
        creators={creators}
        platformCounts={platformCounts}
        selectedPlatforms={selectedPlatforms}
        onTogglePlatform={handleTogglePlatform}
        onSelectAllPlatforms={handleSelectAllPlatforms}
        onClearPlatforms={handleClearPlatforms}
        onOpenCreateAlbum={() => {
          setAlbumModalMode('create_only');
          setIsAlbumModalOpen(true);
        }}
      />

      {/* Floating Bottom Action Bar */}
      <BatchActionBar
        selectedIds={selectedIds}
        onDeselectAll={handleDeselectAll}
        onAddToAlbum={() => {
          setAlbumModalMode('add_to_album');
          setIsAlbumModalOpen(true);
        }}
        onToggleFavoriteBatch={handleBatchToggleFavorite}
        onDownloadZipBatch={handleBatchDownloadZip}
        onDownloadCsvBatch={handleBatchDownloadCsv}
        onDeleteBatch={handleBatchDelete}
        isProcessing={isBatchProcessing}
      />

      {/* Create / Add to Album Modal */}
      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        mode={albumModalMode}
        albums={albums}
        selectedMediaIds={selectedIds}
        onCreateAlbum={handleCreateAlbum}
        onAddItemsToAlbum={handleAddItemsToAlbum}
      />

      {/* Lightbox Modal */}
      <MediaLightboxModal
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
        onDelete={handleDeleteMedia}
        onSelectCreator={(username) => setCurrentView({ type: 'creator_detail', username })}
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

      {/* Global Job Completion Toast Notification */}
      <JobNotificationToast
        notice={completedNotice}
        onClose={() => setCompletedNotice(null)}
      />
    </div>
  );
}
