'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GooglePhotosSidebar, GooglePhotosTab } from '@/components/vault/GooglePhotosSidebar';
import { GooglePhotosTopBar, MediaTypeFilter } from '@/components/vault/GooglePhotosTopBar';
import { MediaGallery } from '@/components/vault/MediaGallery';
import { MediaLightboxModal, MediaItem } from '@/components/modals/MediaLightboxModal';
import { AlbumModal } from '@/components/modals/AlbumModal';
import { AdapterHealthDrawer } from '@/components/modals/AdapterHealthDrawer';
import { ArchiveImportModal } from '@/components/modals/ArchiveImportModal';
import { CreatorsHub, CreatorStats } from '@/components/vault/CreatorsHub';
import { JobNotificationToast, CompletedJobNotice } from '@/components/studio/JobNotificationToast';
import { JobRow, JobStats } from '@/components/studio/JobPipeline';
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
} from '@/components/ui/Icons';

import { AlbumSummary } from '@/components/vault/VaultSidebar';

type BackendStatus = 'loading' | 'ok' | 'offline';

const API = '/api';


export default function VaultPage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [creatorsList, setCreatorsList] = useState<CreatorStats[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [storageStats, setStorageStats] = useState<{ total_bytes: number; total_files: number; human_size: string } | null>(null);


  // Google Photos Navigation & View States
  const [currentTab, setCurrentTab] = useState<GooglePhotosTab>('photos');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSummary | null>(null);
  const [albumDetailItems, setAlbumDetailItems] = useState<MediaItem[]>([]);

  // Search & Filter Omnibar States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');

  // Sidebar Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Batch Multi-Selection States
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
      const healthRes = await fetch(`${API}/health`).catch(() => null);
      if (healthRes && healthRes.ok) {
        setBackendStatus('ok');
      } else {
        setBackendStatus('offline');
      }

      // 2. Fetch Media Library
      const mediaRes = await fetch(`${API}/media?limit=1500`).catch(() => null);
      if (mediaRes && mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const mediaHash = JSON.stringify(mediaData.map((m: MediaItem) => `${m.id}:${m.is_favorite}:${m.created_at}`));
        if (mediaHash !== lastMediaHashRef.current) {
          lastMediaHashRef.current = mediaHash;
          setMedia(mediaData);
        }
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
        setJobStats(statsData);
      }

      // 6. Fetch Active Jobs & trigger completion toast
      const jobsRes = await fetch(`${API}/jobs?limit=20`).catch(() => null);
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
      const storageRes = await fetch(`${API}/media/storage`).catch(() => null);
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
      const res = await fetch(`${API}/albums/${albumId}`);
      if (res.ok) {
        const data = await res.json();
        setAlbumDetailItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch album details:', err);
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
    const interval = setInterval(() => refreshData(false), 5000);
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

  // Selection handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(displayMedia.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Single Item Actions
  const handleToggleFavorite = async (id: number) => {
    try {
      const item = media.find((m) => m.id === id);
      if (!item) return;
      const res = await fetch(`${API}/media/${id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !item.is_favorite }),
      });
      if (res.ok) {
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_favorite: !m.is_favorite } : m))
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Hapus media ini secara permanen dari Vault?')) return;
    try {
      const res = await fetch(`${API}/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        if (lightboxItem?.id === id) setLightboxItem(null);
      }
    } catch (err) {
      console.error('Failed to delete media:', err);
    }
  };

  // Batch Operations
  const handleBatchDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch(`${API}/export/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediavault-batch-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} item terpilih secara permanen dari Vault?`)) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch(`${API}/media/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: selectedIds }),
      });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Batch delete failed:', err);
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
      const res = await fetch(`${API}/albums`, {
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
      const res = await fetch(`${API}/albums/${albumId}`, {
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
      const res = await fetch(`${API}/albums/${albumId}/items`, {
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

  // Statistics for Sidebar Counters

  const sidebarStats = useMemo(() => {
    return {
      totalMedia: media.length,
      totalAlbums: albums.length,
      totalCreators: creatorsList.length,
      totalFavorites: media.filter((m) => m.is_favorite).length,
      storageHumanSize: storageStats?.human_size || '0 MB',
      totalBytes: storageStats?.total_bytes || 0,
    };
  }, [media, albums, creatorsList, storageStats]);


  return (
    <div className="stitch-bg min-h-[100dvh] text-slate-900 flex flex-col antialiased selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      
      {/* 1. Google Photos Left Navigation Sidebar */}
      <GooglePhotosSidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSelectedCreator(null);
          setSelectedAlbum(null);
          setSelectedIds([]);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        stats={sidebarStats}
        backendStatus={backendStatus}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAdapters={() => setIsAdaptersDrawerOpen(true)}
      />

      {/* Main Viewport Container (Offset dynamically by sidebar width) */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        }`}
      >
        {/* 2. Google Photos Top Universal Omnibar & Contextual Action Bar */}
        <GooglePhotosTopBar
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          mediaTypeFilter={mediaTypeFilter}
          onMediaTypeChange={setMediaTypeFilter}
          selectedCount={selectedIds.length}
          totalCount={displayMedia.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onAddToAlbum={handleOpenAddToAlbum}
          onBatchDownloadZip={handleBatchDownloadZip}
          onBatchDelete={handleBatchDelete}
          isBatchProcessing={isBatchProcessing}
        />


        {/* 3. Main Dynamic Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* VIEW: Creators Hub Tab */}
          {currentTab === 'explore' && !selectedCreator && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Koleksi Kreator & Akun
                  </h1>
                  <span className="text-xs text-slate-500 font-medium">
                    Temukan dan jelajahi media berdasarkan kreator yang telah Anda arsipkan
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                  {creatorsList.length} Kreator
                </span>
              </div>

              <CreatorsHub
                creators={creatorsList}
                loading={false}
                onSelectCreator={(username) => setSelectedCreator(username)}
              />
            </div>
          )}

          {/* VIEW: Custom Albums Tab */}
          {currentTab === 'albums' && !selectedAlbum && (
            <div className="flex flex-col gap-6">
              {/* Header & Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Album & Koleksi
                  </h1>
                  <span className="text-xs text-slate-500 font-medium">
                    Kelola dan kelompokkan media vault Anda ke dalam album kustom
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateAlbum}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  <IconFolderPlus className="w-4 h-4" />
                  <span>Buat Album Baru</span>
                </button>
              </div>

              {/* Album Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Create New Album Tile Card */}
                <button
                  type="button"
                  onClick={handleOpenCreateAlbum}
                  className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all cursor-pointer aspect-square shadow-2xs"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                    <IconFolderPlus className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-600">
                    Album Baru
                  </span>
                </button>

                {/* Album Items */}
                {albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => setSelectedAlbum(album)}
                    className="group relative rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 p-2.5 flex flex-col gap-2 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md aspect-square overflow-hidden"
                  >
                    {/* Stacked Cover Image Frame */}
                    <div className="w-full flex-1 rounded-xl overflow-hidden bg-slate-100 relative">
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
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <IconLayers className="w-8 h-8" />
                        </div>
                      )}

                      
                      {/* Count Badge */}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white font-mono text-[10px] font-bold">
                        {album.items_count} media
                      </span>
                    </div>

                    {/* Album Meta */}
                    <div className="flex flex-col px-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {album.name}
                      </span>
                      {album.description && (
                        <span className="text-[10px] text-slate-500 truncate">
                          {album.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: Photos / Date Stream (or filtered Creator/Album view) */}
          {(currentTab === 'photos' || currentTab === 'favorites' || selectedCreator || selectedAlbum) && (
            <MediaGallery
              media={displayMedia}
              onOpenLightbox={(item) => setLightboxItem(item)}
              onDeleteItem={handleDeleteItem}
              onToggleFavorite={handleToggleFavorite}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              viewTitle={
                selectedAlbum
                  ? `Album: ${selectedAlbum.name}`
                  : selectedCreator
                  ? `Arsip Kreator: @${selectedCreator}`
                  : currentTab === 'favorites'
                  ? 'Media Favorit & Berbintang'
                  : undefined
              }
              viewSubtitle={
                selectedAlbum
                  ? selectedAlbum.description || 'Koleksi album pengguna'
                  : selectedCreator
                  ? 'Semua video dan foto dari akun ini'
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
        </main>
      </div>

      {/* 4. Lightbox Modal */}
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


      {/* 5. Album Creation / Add Modal */}
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


      {/* 6. Archive Ingestion Modal */}
      <ArchiveImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => refreshData(true)}
      />

      {/* 7. Adapters & Health Drawer */}
      <AdapterHealthDrawer
        isOpen={isAdaptersDrawerOpen}
        onClose={() => setIsAdaptersDrawerOpen(false)}
      />


      {/* 8. Toast Notifications */}
      {completedNotice && (
        <JobNotificationToast
          notice={completedNotice}
          onClose={() => setCompletedNotice(null)}
        />
      )}


    </div>
  );
}
