'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { MediaGallery } from '../components/MediaGallery';
import { MediaLightboxModal, MediaItem } from '../components/MediaLightboxModal';
import { VaultSidebar, VaultViewMode, AlbumSummary, CreatorSummary } from '../components/VaultSidebar';
import { BatchActionBar } from '../components/BatchActionBar';
import { AlbumModal } from '../components/AlbumModal';
import { AdapterHealthDrawer } from '../components/AdapterHealthDrawer';
import { ArchiveImportModal } from '../components/ArchiveImportModal';
import { JobRow } from '../components/JobPipeline';
import {
  IconFolder,
  IconFolderPlus,
  IconUser,
  IconStarFilled,
  IconLayers,
  IconPlus,
} from '../components/Icons';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';

export default function VaultPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [mediaError, setMediaError] = useState<string>('');

  // Navigation & View State
  const [currentView, setCurrentView] = useState<VaultViewMode>({ type: 'timeline' });
  const [albumDetailItems, setAlbumDetailItems] = useState<MediaItem[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Modals state
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumModalMode, setAlbumModalMode] = useState<'create_only' | 'add_to_album'>('create_only');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdaptersDrawerOpen, setIsAdaptersDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Parallax scroll hooks
  const { scrollY } = useScroll();
  const orbY1 = useTransform(scrollY, [0, 800], [0, 140]);
  const orbY2 = useTransform(scrollY, [0, 800], [0, -120]);

  const isFetchingRef = useRef(false);

  // 1. Refresh Data (Media, Albums, Jobs)
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

      // 4. Fetch Jobs count
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
    const interval = setInterval(() => refreshData(false), 3500);
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

  // Determine active media list to display
  const displayMedia = useMemo(() => {
    switch (currentView.type) {
      case 'timeline':
        return media;
      case 'favorites':
        return media.filter((m) => m.is_favorite);
      case 'album_detail':
        return albumDetailItems;
      case 'creator_detail':
        return media.filter((m) => (m.username || 'Anonymous') === currentView.username);
      case 'type_filter':
        if (currentView.kind === 'photo') {
          return media.filter(
            (m) =>
              m.files?.some((f) => f.kind === 'image') &&
              !m.files?.some((f) => f.path?.endsWith('.txt'))
          );
        } else if (currentView.kind === 'video') {
          return media.filter((m) =>
            m.files?.some((f) => f.kind === 'video' || f.path?.endsWith('.mp4'))
          );
        } else if (currentView.kind === 'threads') {
          return media.filter(
            (m) => m.platform === 'threads' || m.files?.some((f) => f.path?.endsWith('.txt'))
          );
        }
        return media;
      default:
        return media;
    }
  }, [currentView, media, albumDetailItems]);

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
      // Toggle favorite for all selected
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

      {/* Main Workspace Layout (Sidebar + Gallery Canvas) */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-start gap-8">
        
        {/* Left Sidebar */}
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
          onOpenCreateAlbum={() => {
            setAlbumModalMode('create_only');
            setIsAlbumModalOpen(true);
          }}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col gap-8">
          
          {/* Top Bar for Mobile Sidebar Toggle */}
          <div className="flex lg:hidden items-center justify-between p-3 rounded-2xl bg-[#EEF2F7] shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff]">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E5EBF2] shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff] text-xs font-bold text-slate-700"
            >
              <IconLayers className="w-4 h-4 text-indigo-500" />
              <span>Menu & Albums</span>
            </button>

            <span className="text-xs font-mono text-slate-500 font-bold">
              {displayMedia.length} Media
            </span>
          </div>

          {/* If View is Creators List Hub */}
          {currentView.type === 'creators_list' ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-extrabold text-slate-800">Creators Hub</h1>
                <p className="text-xs text-slate-500 font-mono">
                  Explore media archived by content creators
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {creators.map((c) => (
                  <motion.div
                    key={c.username}
                    whileHover={{ y: -4 }}
                    onClick={() => setCurrentView({ type: 'creator_detail', username: c.username })}
                    className="p-5 rounded-[2rem] bg-[#EEF2F7] shadow-[6px_6px_16px_#cbd5e1,-6px_-6px_16px_#ffffff] border border-white/90 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#E5EBF2] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center text-indigo-600 font-extrabold shrink-0">
                        <IconUser className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-extrabold text-slate-800 truncate">
                          @{c.username}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {c.platforms.join(', ')}
                        </span>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-[#E5EBF2] text-indigo-600 shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff]">
                      {c.count} items
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : currentView.type === 'albums_list' ? (
            /* If View is Albums List Hub */
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-extrabold text-slate-800">My Albums</h1>
                  <p className="text-xs text-slate-500 font-mono">
                    Custom collections and categorized media
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setAlbumModalMode('create_only');
                    setIsAlbumModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 shadow-[3px_3px_10px_rgba(79,70,229,0.35),-2px_-2px_6px_#ffffff] hover:bg-indigo-700 cursor-pointer"
                >
                  <IconFolderPlus className="w-4 h-4" />
                  <span>New Album</span>
                </motion.button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.map((a) => (
                  <motion.div
                    key={a.id}
                    whileHover={{ y: -5 }}
                    onClick={() =>
                      setCurrentView({
                        type: 'album_detail',
                        albumId: a.id,
                        albumName: a.name,
                      })
                    }
                    className="group rounded-[2rem] bg-[#EEF2F7] shadow-[7px_7px_18px_#cbd5e1,-7px_-7px_18px_#ffffff] border border-white/90 p-4 flex flex-col gap-3 cursor-pointer overflow-hidden"
                  >
                    <div className="relative aspect-video w-full rounded-2xl bg-[#E5EBF2] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] overflow-hidden flex items-center justify-center text-slate-400">
                      {a.cover_file_url ? (
                        <img
                          src={a.cover_file_url}
                          alt={a.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <IconFolder className="w-10 h-10 text-slate-300" />
                      )}
                      <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-900/80 text-white backdrop-blur-md">
                        {a.items_count} items
                      </span>
                    </div>

                    <div className="flex flex-col px-1">
                      <span className="text-sm font-extrabold text-slate-800">{a.name}</span>
                      {a.description && (
                        <span className="text-xs text-slate-400 truncate">{a.description}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Default Gallery View (Timeline, Favorites, Album Detail, Creator Detail, Type Filter) */
            <MediaGallery
              media={displayMedia}
              selectedPlatform={selectedPlatform}
              onSelectPlatform={setSelectedPlatform}
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
                  : undefined
              }
              viewSubtitle={
                currentView.type === 'album_detail'
                  ? 'Custom Album Collection'
                  : currentView.type === 'creator_detail'
                  ? 'Media downloaded from this author'
                  : undefined
              }
              onBackToTimeline={
                currentView.type !== 'timeline'
                  ? () => setCurrentView({ type: 'timeline' })
                  : undefined
              }
              error={mediaError}
            />
          )}

        </main>
      </div>

      {/* Floating Bottom Action Bar for Multi-Selection */}
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
    </div>
  );
}
