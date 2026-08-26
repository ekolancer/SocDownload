'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconStar,
  IconStarFilled,
  IconCheck,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconPhoto,
  IconVideoCamera,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
} from '@/components/ui/Icons';
import { MediaItem } from '@/components/modals/MediaLightboxModal';

interface MediaGalleryProps {
  media: MediaItem[];
  onOpenLightbox: (item: MediaItem) => void;
  onDeleteItem?: (id: number) => Promise<void>;
  onToggleFavorite?: (id: number) => Promise<void>;
  onSelectCreator?: (username: string) => void;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  viewTitle?: string;
  viewSubtitle?: string;
  onBackToTimeline?: () => void;
  error?: string;
}

const PAGE_SIZE_OPTIONS = [30, 60, 90, 120, 150];

function getPlatformBadge(platform: string) {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return {
        icon: <IconInstagram className="w-3 h-3 text-pink-400" />,
        bg: 'bg-slate-950/80 text-pink-300 border-white/10',
        name: 'Instagram',
      };
    case 'tiktok':
      return {
        icon: <IconTikTok className="w-3 h-3 text-white" />,
        bg: 'bg-slate-950/80 text-slate-200 border-white/10',
        name: 'TikTok',
      };
    case 'threads':
      return {
        icon: <IconThreads className="w-3 h-3 text-white" />,
        bg: 'bg-slate-950/80 text-slate-200 border-white/10',
        name: 'Threads',
      };
    case 'youtube':
      return {
        icon: <IconYouTube className="w-3 h-3 text-red-500" />,
        bg: 'bg-slate-950/80 text-red-300 border-white/10',
        name: 'YouTube',
      };
    case 'x':
    case 'twitter':
      return {
        icon: <IconX className="w-3 h-3 text-white" />,
        bg: 'bg-slate-950/80 text-slate-200 border-white/10',
        name: 'X',
      };
    case 'reddit':
      return {
        icon: <IconReddit className="w-3 h-3 text-orange-500" />,
        bg: 'bg-slate-950/80 text-orange-300 border-white/10',
        name: 'Reddit',
      };
    case 'pinterest':
      return {
        icon: <IconPinterest className="w-3 h-3 text-red-500" />,
        bg: 'bg-slate-950/80 text-red-300 border-white/10',
        name: 'Pinterest',
      };
    default:
      return {
        icon: <IconDownload className="w-3 h-3 text-emerald-400" />,
        bg: 'bg-slate-950/80 text-emerald-300 border-white/10',
        name: platform || 'Web',
      };
  }
}

// Windowing Pagination
function getVisiblePages(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function MediaGallery({
  media,
  onOpenLightbox,
  onToggleFavorite,
  selectedIds = [],
  onToggleSelect,
  viewTitle,
  onBackToTimeline,
}: MediaGalleryProps) {
  // Default 6x5 = 30 items per page
  const [pageSize, setPageSize] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when media changes
  useEffect(() => {
    setCurrentPage(1);
  }, [media.length, pageSize]);

  // Compute Pagination Metrics
  const totalItems = media.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMedia = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return media.slice(start, start + pageSize);
  }, [media, safeCurrentPage, pageSize]);

  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (media.length === 0) {
    return (
      <div className="w-full p-1.5 sm:p-2 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-xl backdrop-blur-xl">
        <div className="w-full flex flex-col items-center justify-center p-12 sm:p-16 rounded-xl bg-slate-950/50 border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 text-emerald-400 flex items-center justify-center mb-4 shadow-xs">
            <IconPhoto className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Belum ada media di Vault ini
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            Tempelkan URL postingan di Download Studio atau aktifkan Auto-Sync untuk mulai mengumpulkan media.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-16 select-none">
      
      {/* Optional Title Bar when inside Album / Filter view */}
      {viewTitle && (
        <div className="p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-md backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/[0.06]">
            <div className="flex items-center gap-3">
              {onBackToTimeline && (
                <button
                  type="button"
                  onClick={onBackToTimeline}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <IconChevronLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              )}
              <h2 className="text-base font-bold text-white tracking-tight">
                {viewTitle}
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              {totalItems} media
            </span>
          </div>
        </div>
      )}

      {/* Direct 6-Column Responsive Media Grid (Default 6x5 = 30 Items) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {paginatedMedia.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const firstFile = item.files?.[0];
          const isVideo = firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));
          const fileUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';
          const badge = getPlatformBadge(item.platform);

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`group relative p-1 rounded-2xl transition-all duration-200 cursor-pointer aspect-[4/5] ${
                isSelected
                  ? 'bg-emerald-500/20 ring-2 ring-emerald-400 shadow-xl scale-[0.98]'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border border-white/[0.08] hover:border-white/20 shadow-sm hover:shadow-xl hover:-translate-y-0.5'
              }`}
              onClick={() => onOpenLightbox(item)}
            >
              {/* Inner Media Canvas */}
              <div className="w-full h-full rounded-xl overflow-hidden bg-slate-950 relative border border-white/[0.04]">
                {firstFile ? (
                  isVideo ? (
                    <video
                      src={`${fileUrl}#t=0.5`}
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={fileUrl}
                      alt={item.caption || item.username || 'Media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <IconPhoto className="w-8 h-8" />
                  </div>
                )}

                {/* Top-Left: Multi-Select Checkbox */}
                <div
                  className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSelect) onToggleSelect(item.id);
                  }}
                >
                  <button
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? 'bg-emerald-500 border-white text-slate-950 scale-110 font-bold'
                        : 'bg-black/60 border-white/60 text-white hover:bg-black/80 backdrop-blur-xs'
                    }`}
                    aria-label="Pilih item"
                    title="Pilih item"
                  >
                    {isSelected && <IconCheck className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </div>

                {/* Top-Right: Platform Refraction Pill */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border shadow-xs backdrop-blur-md ${badge.bg}`}>
                    {badge.icon}
                  </span>
                </div>

                {/* Bottom Overlay Gradient with Creator and Video Badge */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 pt-7 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex items-end justify-between text-white text-xs opacity-90 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col min-w-0 pr-2">
                    {item.username && (
                      <span className="font-bold text-[11px] truncate text-white drop-shadow-xs">
                        @{item.username}
                      </span>
                    )}
                    {item.caption && (
                      <span className="text-[9.5px] text-slate-400 truncate font-medium">
                        {item.caption}
                      </span>
                    )}
                  </div>

                  {/* Video / Carousel Indicator */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isVideo && (
                      <div className="p-1 rounded-md bg-black/70 border border-white/10 text-white backdrop-blur-xs">
                        <IconVideoCamera className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {item.files && item.files.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-black/70 border border-white/10 text-white font-mono text-[9px] font-bold backdrop-blur-xs">
                        +{item.files.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Favorite Star Hover Button */}
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    className={`absolute bottom-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                      item.is_favorite
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 border border-white/10'
                    }`}
                    title={item.is_favorite ? 'Hapus dari Favorit' : 'Tandai Favorit'}
                    aria-label={item.is_favorite ? 'Hapus dari Favorit' : 'Tandai Favorit'}
                  >
                    {item.is_favorite ? (
                      <IconStarFilled className="w-3.5 h-3.5" />
                    ) : (
                      <IconStar className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modern SaaS Pagination Controls (Multiples of 30) */}
      {totalPages > 1 && (
        <div className="w-full p-2 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-lg backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 px-3">
            <span className="text-xs font-mono text-slate-300">
              Menampilkan <strong className="text-white font-bold">{Math.min(totalItems, (safeCurrentPage - 1) * pageSize + 1)}-{Math.min(totalItems, safeCurrentPage * pageSize)}</strong> dari <strong className="text-white font-bold">{totalItems}</strong> media
            </span>

            {/* Page Size Selector (Multiples of 30) */}
            <div className="flex items-center gap-1 bg-slate-950/60 border border-white/[0.08] p-0.5 rounded-xl text-xs font-mono font-bold text-slate-400">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    pageSize === size
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 px-3">
            {/* Prev Page */}
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              className="p-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {visiblePages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-xs font-mono text-slate-500">
                    ...
                  </span>
                );
              }
              const pageNum = p as number;
              const isCurrent = pageNum === safeCurrentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'bg-slate-950/60 hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              className="p-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Selanjutnya"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
