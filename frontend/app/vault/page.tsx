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
import { JobNotificationToast, CompletedJobNotice } from '../components/JobNotificationToast';
import { JobRow } from '../components/JobPipeline';
import {
  IconFolder,
  IconFolderPlus,
  IconUser,
  IconLayers,
} from '../components/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function VaultPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [mediaError, setMediaError] = useState<string>('');

  // Navigation & Multi-Select Platform Filter State
  const [currentView, setCurrentView] = useState<VaultViewMode>({ type: 'timeline' });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [albumDetailItems, setAlbumDetailItems] = useState<MediaItem[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

      // 4. Fetch Jobs & trigger completion toast
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
        activeJobsCount={activeJobsCount}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
        onRefresh={() => refreshData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Layout */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-start gap-7">
        
        {/* Left Navigation Drawer & Multi-Select Platform Filters */}
        <VaultSidebar
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
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          
          {/* Mobile Sidebar Toggle Button */}
          <div className="flex lg:hidden items-center justify-between p-3 rounded-[16px] bg-white border border-slate-200/90 shadow-sm">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <IconLayers className="w-4 h-4 text-indigo-600" />
              <span>Filters & Albums</span>
            </button>

            <span className="text-xs font-mono text-slate-600 font-bold">
              {displayMedia.length} Media
            </span>
          </div>

          {/* If View is Creators List Hub */}
          {currentView.type === 'creators_list' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Creators Hub</h1>
                <p className="text-xs text-slate-500 font-normal">
                  Explore media archived by content creators
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators.map((c) => (
                  <div
                    key={c.username}
                    onClick={() => setCurrentView({ type: 'creator_detail', username: c.username })}
                    className="p-4 rounded-[18px] bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Symmetrical Squircle Avatar */}
                      <div className="w-10 h-10 rounded-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-extrabold shrink-0">
                        <IconUser className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          @{c.username}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {c.platforms.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Squircle Count Badge */}
                    <span className="min-w-[24px] h-6 px-2 rounded-[6px] text-xs font-mono font-bold bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    <div className="relative aspect-video w-full rounded-[12px] bg-slate-950 overflow-hidden flex items-center justify-center text-slate-400">
                      {a.cover_file_url ? (
                        <img
                          src={a.cover_file_url}
                          alt={a.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <IconFolder className="w-10 h-10 text-slate-400" />
                      )}
                      {/* Squircle Badge */}
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
            /* Default Gallery View */
            <MediaGallery
              media={displayMedia}
              onOpenLightbox={(item) => setLightboxItem(item)}
              onDeleteItem={handleDeleteMedia}
              onToggleFavorite={handleToggleFavorite}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
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

        </main>
      </div>

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
