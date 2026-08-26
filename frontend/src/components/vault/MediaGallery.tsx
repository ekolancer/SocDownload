'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconLayers,
  IconStar,
  IconStarFilled,
  IconCheck,
  IconCalendar,
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
  IconLink,
  IconExternalLink,
  IconSparkles,
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
  onSelectDateGroup?: (items: MediaItem[]) => void;
}

const PAGE_SIZE_OPTIONS = [24, 48, 96, 192];

function getPlatformBadge(platform: string) {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return {
        icon: <IconInstagram className="w-3 h-3 text-pink-500" />,
        bg: 'bg-pink-50/90 text-pink-900 border-pink-200/80',
        name: 'Instagram',
      };
    case 'tiktok':
      return {
        icon: <IconTikTok className="w-3 h-3 text-slate-900" />,
        bg: 'bg-slate-100/90 text-slate-900 border-slate-200/80',
        name: 'TikTok',
      };
    case 'threads':
      return {
        icon: <IconThreads className="w-3 h-3 text-slate-900" />,
        bg: 'bg-slate-100/90 text-slate-900 border-slate-200/80',
        name: 'Threads',
      };
    case 'youtube':
      return {
        icon: <IconYouTube className="w-3 h-3 text-red-600" />,
        bg: 'bg-red-50/90 text-red-900 border-red-200/80',
        name: 'YouTube',
      };
    case 'x':
    case 'twitter':
      return {
        icon: <IconX className="w-3 h-3 text-slate-900" />,
        bg: 'bg-slate-100/90 text-slate-900 border-slate-200/80',
        name: 'X',
      };
    case 'reddit':
      return {
        icon: <IconReddit className="w-3 h-3 text-orange-600" />,
        bg: 'bg-orange-50/90 text-orange-900 border-orange-200/80',
        name: 'Reddit',
      };
    case 'pinterest':
      return {
        icon: <IconPinterest className="w-3 h-3 text-red-600" />,
        bg: 'bg-red-50/90 text-red-900 border-red-200/80',
        name: 'Pinterest',
      };
    default:
      return {
        icon: <IconDownload className="w-3 h-3 text-indigo-600" />,
        bg: 'bg-indigo-50/90 text-indigo-900 border-indigo-200/80',
        name: platform || 'Web',
      };
  }
}

// Group media items chronologically by date
function groupMediaByDate(items: MediaItem[]) {
  const groups: { [key: string]: { dateLabel: string; rawDate: Date; items: MediaItem[] } } = {};

  items.forEach((item) => {
    let dateLabel = 'Koleksi Tersimpan';
    let rawDate = new Date(0);

    const dateStr = item.posted_at || item.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      rawDate = isNaN(d.getTime()) ? new Date() : d;

      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (rawDate.toDateString() === today.toDateString()) {
        dateLabel = 'Hari Ini';
      } else if (rawDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Kemarin';
      } else {
        dateLabel = rawDate.toLocaleDateString('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: rawDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = {
        dateLabel,
        rawDate,
        items: [],
      };
    }
    groups[dateLabel].items.push(item);
  });

  return Object.values(groups);
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
  onDeleteItem,
  onToggleFavorite,
  onSelectCreator,
  selectedIds = [],
  onToggleSelect,
  viewTitle,
  viewSubtitle,
  onBackToTimeline,
  error,
}: MediaGalleryProps) {
  const [pageSize, setPageSize] = useState<number>(48);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);

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

  const dateGroups = useMemo(() => groupMediaByDate(paginatedMedia), [paginatedMedia]);
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleGroupSelect = (groupItems: MediaItem[]) => {
    if (!onToggleSelect) return;
    const groupIds = groupItems.map((i) => i.id);
    const allSelected = groupIds.every((id) => selectedIds.includes(id));

    groupIds.forEach((id) => {
      if (allSelected) {
        if (selectedIds.includes(id)) onToggleSelect(id);
      } else {
        if (!selectedIds.includes(id)) onToggleSelect(id);
      }
    });
  };

  const handleCopyLink = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.source_url);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  if (media.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl bg-white/70 border border-slate-200/80 shadow-sm text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mb-4 shadow-xs">
          <IconPhoto className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          Belum ada media di Vault ini
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          Tempelkan URL video atau postingan di Download Studio atau aktifkan Auto-Sync untuk mulai mengumpulkan media.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-12 select-none">
      
      {/* Optional Title Bar when inside Album / Filter view */}
      {viewTitle && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            {onBackToTimeline && (
              <button
                type="button"
                onClick={onBackToTimeline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <span>← Kembali ke Semua Foto</span>
              </button>
            )}
            <div className="flex flex-col">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {viewTitle}
              </h2>
              {viewSubtitle && (
                <span className="text-xs text-slate-500 font-medium">
                  {viewSubtitle}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
            {totalItems} Media
          </span>
        </div>
      )}

      {/* Chronological Date Groups (Google Photos Dynamic Stream) */}
      <div className="flex flex-col gap-8">
        {dateGroups.map((group) => {
          const groupIds = group.items.map((i) => i.id);
          const isGroupAllSelected = groupIds.length > 0 && groupIds.every((id) => selectedIds.includes(id));
          const isGroupPartiallySelected = groupIds.some((id) => selectedIds.includes(id)) && !isGroupAllSelected;

          return (
            <section key={group.dateLabel} className="flex flex-col gap-3">
              {/* Sticky Date Section Header with Group Select-All (Studio Glass-Panel) */}
              <div className="sticky top-16 z-20 flex items-center justify-between py-2.5 px-4 rounded-2xl glass-panel bg-white/70 backdrop-blur-xl border border-white/60 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  {/* Circle Select All for this Date */}
                  <button
                    type="button"
                    onClick={() => handleToggleGroupSelect(group.items)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      isGroupAllSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : isGroupPartiallySelected
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-slate-300 hover:border-blue-500 bg-white/80'
                    }`}
                    title={isGroupAllSelected ? 'Batal pilih tanggal ini' : 'Pilih semua media tanggal ini'}
                    aria-label={isGroupAllSelected ? 'Batal pilih tanggal ini' : 'Pilih semua media tanggal ini'}
                  >
                    {isGroupAllSelected && <IconCheck className="w-3.5 h-3.5 stroke-[3]" />}
                    {isGroupPartiallySelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </button>

                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
                    {group.dateLabel}
                  </h3>
                </div>


                <span className="text-[11px] font-mono font-semibold text-slate-500">
                  {group.items.length} item
                </span>
              </div>

              {/* Dynamic Photo Stream Grid (4-6 columns responsive) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                {group.items.map((item) => {
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
                      className={`group relative rounded-2xl overflow-hidden bg-slate-100 border transition-all duration-200 cursor-pointer aspect-[4/5] shadow-xs hover:shadow-md ${
                        isSelected
                          ? 'ring-3 ring-blue-600 border-transparent shadow-lg scale-[0.98]'
                          : 'border-slate-200/60 hover:border-slate-300'
                      }`}
                      onClick={() => onOpenLightbox(item)}
                    >
                      {/* Media Image / Video Thumbnail */}
                      <div className="w-full h-full relative overflow-hidden bg-slate-900/5">
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
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <IconPhoto className="w-8 h-8" />
                          </div>
                        )}
                      </div>


                      {/* Top-Left: Google Photos Selection Checkbox */}
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
                              ? 'bg-blue-600 border-white text-white scale-110'
                              : 'bg-black/30 border-white text-white hover:bg-black/50 backdrop-blur-xs'
                          }`} aria-label="Pilih item" title="Pilih item"
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
                      <div className="absolute inset-x-0 bottom-0 p-2.5 pt-6 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent flex items-end justify-between text-white text-xs opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col min-w-0 pr-2">
                          {item.username && (
                            <span className="font-bold text-[11px] truncate text-white drop-shadow-xs">
                              @{item.username}
                            </span>
                          )}
                          {item.caption && (
                            <span className="text-[9.5px] text-slate-300 truncate font-medium">
                              {item.caption}
                            </span>
                          )}
                        </div>

                        {/* Video / Carousel Indicator */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isVideo && (
                            <div className="p-1 rounded-md bg-black/50 text-white backdrop-blur-xs">
                              <IconVideoCamera className="w-3 h-3" />
                            </div>
                          )}
                          {item.files && item.files.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-black/50 text-white font-mono text-[9px] font-bold backdrop-blur-xs">
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
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100'
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
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Google Photos Smooth Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 font-mono">
            <span>Menampilkan {paginatedMedia.length} dari {totalItems} media</span>
            <span>•</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} per halaman
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>

            {visiblePages.map((page, idx) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 font-mono text-xs text-slate-500">
                    ...
                  </span>
                );
              }
              const pageNum = page as number;
              const isCurrent = pageNum === safeCurrentPage;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
