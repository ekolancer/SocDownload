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
  IconFolderMinus,
  IconPencil,
  IconTrash,
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
  const [albumModalMode, setAlbumModalMode] = useState<'create_only' | 'add_to_album' | 'edit'>('create_only');
  const [editingAlbum, setEditingAlbum] = useState<{ id: number; name: string; description?: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [completedNotice, setCompletedNotice] = useState<CompletedJobNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevJobsRef = useRef<JobRow[]>([]);
  const isFetchingRef = useRef(false);
  // Dedup caches to skip re-render when polling returns identical data
  const lastMediaHashRef = useRef<string>('');
  const lastAlbumsHashRef = useRef<string>('');
  const lastCreatorsHashRef = useRef<string>('');
  const lastJobStatsHashRef = useRef<string>('');
  const lastJobsHashRef = useRef<string>('');

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
        // Deduplicate: only update state if data actually changed
        const mediaHash = JSON.stringify(mediaData.map((m: MediaItem) => `${m.id}:${m.is_favorite}:${m.created_at}`));
        if (mediaHash !== lastMediaHashRef.current) {
          lastMediaHashRef.current = mediaHash;
          setMedia(mediaData);
        }
        setMediaError('');
      } else {
        setMediaError('Could not sync media library');
      }

      // 3. Fetch Albums
      const albumsRes = await fetch(`${API}/albums`).catch(() => null);
      if (albumsRes && albumsRes.ok) {
        const albumsData = await albumsRes.json();
        const albumsHash = JSON.stringify(albumsData.map((a: AlbumSummary) => `${a.id}:${a.name}:${a.items_count}`));
        if (albumsHash !== lastAlbumsHashRef.current) {
          lastAlbumsHashRef.current = albumsHash;
          setAlbums(albumsData);
        }
      }

      // 4. Fetch Creators Aggregation
      const creatorsRes = await fetch(`${API}/media/creators`).catch(() => null);
      if (creatorsRes && creatorsRes.ok) {
        const creatorsData = await creatorsRes.json();
        const creatorsHash = JSON.stringify(creatorsData);
        if (creatorsHash !== lastCreatorsHashRef.current) {
          lastCreatorsHashRef.current = creatorsHash;
          setCreatorsList(creatorsData);
        }
      }

      // 5. Fetch Job Stats
      const statsRes = await fetch(`${API}/jobs/stats`).catch(() => null);
      if (statsRes && statsRes.ok) {
        const statsData: JobStats = await statsRes.json();
        const statsHash = JSON.stringify(statsData);
        if (statsHash !== lastJobStatsHashRef.current) {
          lastJobStatsHashRef.current = statsHash;
          setJobStats(statsData);
        }
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
        // Deduplicate: only update jobs state if data actually changed
        const jobsHash = JSON.stringify(jobsData.map((j: JobRow) => `${j.id}:${j.status}:${j.finished_at}`));
        if (jobsHash !== lastJobsHashRef.current) {
          lastJobsHashRef.current = jobsHash;
          setJobs(jobsData);
        }
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
    const interval = setInterval(() => refreshData(false), 4000);
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

  const handleUpdateAlbum = async (albumId: number, name: string, description?: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/albums/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        await refreshData(true);
        if (currentView.type === 'album_detail' && currentView.albumId === albumId) {
          setCurrentView({ type: 'album_detail', albumId, albumName: name });
        }
        return true;
      }
    } catch (err) {
      console.error('Update album error:', err);
    }
    return false;
  };

  const handleDeleteAlbum = async (albumId: number, albumName: string) => {
    if (!window.confirm(`Are you sure you want to delete the album "${albumName}"?\n(Your downloaded media files will remain safely in the vault)`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/albums/${albumId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshData(true);
        if (currentView.type === 'album_detail' && currentView.albumId === albumId) {
          setCurrentView({ type: 'albums_list' });
        }
      }
    } catch (err) {
      console.error('Delete album error:', err);
    }
  };

  const handleRemoveFromAlbumBatch = async () => {
    if (currentView.type !== 'album_detail' || selectedIds.length === 0) return;
    if (!window.confirm(`Remove ${selectedIds.length} item(s) from "${currentView.albumName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/albums/${currentView.albumId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        await refreshData(true);
        // Refresh album items
        fetch(`${API}/albums/${currentView.albumId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.items) setAlbumDetailItems(data.items);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Remove items from album error:', err);
    }
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

  // Find active album detail record if in album_detail view
  const currentAlbumRecord = currentView.type === 'album_detail'
    ? albums.find((a) => a.id === currentView.albumId)
    : null;

  return (
    <div className="stitch-bg min-h-screen text-slate-900 flex flex-col antialiased selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Top App Bar */}
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

      {/* Main Container */}
      <main className="flex-grow max-w-[1440px] w-full mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-8">
        
        {/* Vault Navigation Bar & Global Export Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 glass-panel rounded-2xl shadow-sm">
          
          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            
            {/* All Media Tab */}
            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'timeline' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                currentView.type === 'timeline'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <IconLayers className="w-4 h-4" />
              <span>All Media</span>
              <span className={`text-[10px] font-mono ${currentView.type === 'timeline' ? 'opacity-80' : 'text-slate-500'}`}>
                ({media.length})
              </span>
            </button>

            {/* Creators Hub Tab */}
            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'creators_list' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                currentView.type === 'creators_list' || currentView.type === 'creator_detail'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <IconUsers className="w-4 h-4" />
              <span>Creators Hub</span>
              <span className={`text-[10px] font-mono ${currentView.type === 'creators_list' ? 'opacity-80' : 'text-slate-500'}`}>
                ({creatorsList.length || creators.length})
              </span>
            </button>

            {/* Albums Tab */}
            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'albums_list' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                currentView.type === 'albums_list' || currentView.type === 'album_detail'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <IconFolder className="w-4 h-4" />
              <span>Albums</span>
              <span className={`text-[10px] font-mono ${currentView.type === 'albums_list' ? 'opacity-80' : 'text-slate-500'}`}>
                ({albums.length})
              </span>
            </button>

            {/* Favorites Tab */}
            <button
              type="button"
              onClick={() => {
                setCurrentView({ type: 'favorites' });
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                currentView.type === 'favorites'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <IconStar className="w-4 h-4 text-amber-500" />
              <span>Favorites</span>
              <span className={`text-[10px] font-mono ${currentView.type === 'favorites' ? 'opacity-80' : 'text-slate-500'}`}>
                ({favoritesCount})
              </span>
            </button>

          </div>

          {/* Export Vault Dropdown Menu */}
          <div className="relative flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-slate-800 hover:text-indigo-600 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <IconDownload className="w-4 h-4 text-indigo-600" />
              <span>Export Vault</span>
              <span className="text-[10px]">▼</span>
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl glass-panel bg-white/95 shadow-xl p-1.5 z-30 flex flex-col gap-1">
                  
                  {/* Export Full ZIP */}
                  <a
                    href={`${API}/media/export/zip`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white transition-colors"
                  >
                    <IconFolderZip className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="flex flex-col">
                      <span>Full Backup (ZIP)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Media files + metadata</span>
                    </div>
                  </a>

                  {/* Export Metadata CSV */}
                  <a
                    href={`${API}/media/export/csv`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white transition-colors"
                  >
                    <IconFileText className="w-4 h-4 text-sky-600 shrink-0" />
                    <div className="flex flex-col">
                      <span>Metadata CSV</span>
                      <span className="text-[10px] text-slate-400 font-normal">Excel compatible</span>
                    </div>
                  </a>

                  {/* Export Metadata JSON */}
                  <a
                    href={`${API}/media/export/json`}
                    download
                    onClick={() => setIsExportMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-white transition-colors"
                  >
                    <IconSparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex flex-col">
                      <span>Metadata JSON</span>
                      <span className="text-[10px] text-slate-400 font-normal">Full raw records</span>
                    </div>
                  </a>

                </div>
              </>
            )}
          </div>

        </div>

        {/* View Router */}
        {currentView.type === 'creators_list' ? (
          /* Creators Hub Grid */
          <CreatorsHub
            creators={creatorsList}
            onSelectCreator={(username) => {
              setCurrentView({ type: 'creator_detail', username });
            }}
          />
        ) : currentView.type === 'albums_list' ? (
          /* Albums List Hub */
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Albums</h1>
                <p className="text-xs text-slate-500 font-normal">
                  Custom collections and categorized media
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAlbum(null);
                    setAlbumModalMode('create_only');
                    setIsAlbumModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm transition-all cursor-pointer"
                >
                  <IconFolderPlus className="w-4 h-4" />
                  <span>New Album</span>
                </button>
              </div>
            </div>

            {albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 rounded-2xl glass-panel text-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <IconFolder className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No albums created yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Organize your media into albums to quickly categorize your downloads.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAlbum(null);
                    setAlbumModalMode('create_only');
                    setIsAlbumModalOpen(true);
                  }}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  <IconFolderPlus className="w-4 h-4" />
                  <span>Create First Album</span>
                </button>
              </div>
            ) : (
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
                    className="group relative rounded-2xl glass-panel hover:bg-white/80 hover:shadow-xl hover:-translate-y-1 p-3.5 flex flex-col gap-3 cursor-pointer overflow-hidden transition-all"
                  >
                    {/* Cover Thumbnail */}
                    <div className="relative aspect-video w-full rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center text-slate-400">
                      {a.cover_file_url ? (
                        <img
                          src={a.cover_file_url}
                          alt={a.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <IconFolder className="w-10 h-10 text-slate-400" />
                      )}
                      
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/80 text-white border border-white/10">
                        {a.items_count} items
                      </span>

                      {/* Top Right Action Overlay (Edit & Delete) */}
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAlbum({ id: a.id, name: a.name, description: a.description || undefined });
                            setAlbumModalMode('edit');
                            setIsAlbumModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/95 text-slate-700 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all cursor-pointer hover:scale-105"
                          title="Edit Album"
                        >
                          <IconPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(a.id, a.name);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/95 text-slate-700 hover:text-rose-600 flex items-center justify-center shadow-xs transition-all cursor-pointer hover:scale-105"
                          title="Delete Album"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="flex flex-col px-0.5">
                      <span className="text-sm font-bold text-slate-900">{a.name}</span>
                      {a.description && (
                        <span className="text-xs text-slate-400 truncate mt-0.5">{a.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Gallery View with Album Header if in Album Detail */
          <div className="flex flex-col gap-5">
            
            {/* Album Detail Header Banner with Edit & Delete Controls */}
            {currentView.type === 'album_detail' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0">
                    <IconFolder className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-slate-900 truncate">
                        {currentView.albumName}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100/80 text-indigo-700">
                        {albumDetailItems.length} items
                      </span>
                    </div>
                    {currentAlbumRecord?.description && (
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {currentAlbumRecord.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Album Management Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAlbum({
                        id: currentView.albumId,
                        name: currentView.albumName,
                        description: currentAlbumRecord?.description || undefined,
                      });
                      setAlbumModalMode('edit');
                      setIsAlbumModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-700 glass-panel hover:bg-white/80 transition-all cursor-pointer shadow-2xs"
                  >
                    <IconPencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit Album</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAlbum(currentView.albumId, currentView.albumName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                    <span>Delete Album</span>
                  </button>
                </div>
              </div>
            )}

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
          </div>
        )}

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
          setEditingAlbum(null);
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
        onRemoveFromAlbum={currentView.type === 'album_detail' ? handleRemoveFromAlbumBatch : undefined}
        onToggleFavoriteBatch={handleBatchToggleFavorite}
        onDownloadZipBatch={handleBatchDownloadZip}
        onDownloadCsvBatch={handleBatchDownloadCsv}
        onDeleteBatch={handleBatchDelete}
        isProcessing={isBatchProcessing}
      />

      {/* Create / Edit / Add to Album Modal */}
      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => {
          setIsAlbumModalOpen(false);
          setEditingAlbum(null);
        }}
        mode={albumModalMode}
        albums={albums}
        selectedMediaIds={selectedIds}
        initialData={editingAlbum}
        onCreateAlbum={handleCreateAlbum}
        onUpdateAlbum={handleUpdateAlbum}
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
