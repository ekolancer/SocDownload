'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconLayers,
  IconStar,
  IconStarFilled,
  IconCheck,
  IconCalendar,
  IconSearch,
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
} from './Icons';
import { MediaItem } from './MediaLightboxModal';

interface MediaGalleryProps {
  media: MediaItem[];
  onOpenLightbox: (item: MediaItem) => void;
  onDeleteItem?: (id: number) => Promise<void>;
  onToggleFavorite?: (id: number) => Promise<void>;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  viewTitle?: string;
  viewSubtitle?: string;
  onBackToTimeline?: () => void;
  onToggleSidebar?: () => void;
  activePlatformsCount?: number;
  error?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <IconInstagram className="w-3.5 h-3.5 text-pink-500" />;
    case 'tiktok':
      return <IconTikTok className="w-3.5 h-3.5 text-slate-900" />;
    case 'threads':
      return <IconThreads className="w-3.5 h-3.5 text-slate-900" />;
    case 'youtube':
      return <IconYouTube className="w-3.5 h-3.5 text-red-500" />;
    case 'x':
    case 'twitter':
      return <IconX className="w-3.5 h-3.5 text-slate-900" />;
    case 'reddit':
      return <IconReddit className="w-3.5 h-3.5 text-orange-500" />;
    case 'pinterest':
      return <IconPinterest className="w-3.5 h-3.5 text-red-600" />;
    default:
      return <IconPhoto className="w-3.5 h-3.5 text-slate-500" />;
  }
}

// Group media items by date for timeline stream
function groupMediaByDate(items: MediaItem[]) {
  const groups: { [key: string]: MediaItem[] } = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  items.forEach((item) => {
    const rawDate = item.created_at || item.posted_at || '';
    let label = 'Earlier';
    if (rawDate) {
      const d = new Date(rawDate);
      const ds = d.toDateString();
      if (ds === today) {
        label = 'Today';
      } else if (ds === yesterday) {
        label = 'Yesterday';
      } else {
        label = d.toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        });
      }
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export function MediaGallery({
  media,
  onOpenLightbox,
  onDeleteItem,
  onToggleFavorite,
  selectedIds = [],
  onToggleSelect,
  viewTitle,
  viewSubtitle,
  onBackToTimeline,
  onToggleSidebar,
  activePlatformsCount = 0,
  error,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'favorites'>('newest');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter & Sort media
  const filteredMedia = useMemo(() => {
    let result = [...media];

    // Search filter
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

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else if (sortBy === 'favorites') {
      result.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
    }

    return result;
  }, [media, searchQuery, sortBy]);

  // Reset to page 1 whenever search, sort, or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, viewTitle, media.length]);

  // Compute Pagination Metrics
  const totalItems = filteredMedia.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMedia = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredMedia.slice(start, start + pageSize);
  }, [filteredMedia, safeCurrentPage, pageSize]);

  const dateGroups = useMemo(() => groupMediaByDate(paginatedMedia), [paginatedMedia]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Dynamic Header & Search Bar Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        
        {/* Left: Title, Back Button, and Sidebar Trigger */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                activePlatformsCount > 0
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80'
              }`}
              title="Open Filters & Albums"
            >
              <IconLayers className={`w-4 h-4 ${activePlatformsCount > 0 ? 'text-white' : 'text-indigo-600'}`} />
              <span>Filters</span>
              {activePlatformsCount > 0 && (
                <span className="min-w-[18px] h-4.5 px-1.5 rounded-[5px] bg-white/20 text-white text-[10px] font-mono font-black flex items-center justify-center">
                  {activePlatformsCount}
                </span>
              )}
            </button>
          )}

          {onBackToTimeline && (
            <button
              type="button"
              onClick={onBackToTimeline}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0 cursor-pointer border border-slate-200/80 shadow-xs"
            >
              <span>← Back</span>
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate tracking-tight leading-tight">
                {viewTitle || 'Media Vault'}
              </h1>
              {/* Symmetrical Squircle Count Badge */}
              <span className="min-w-[26px] h-6 px-2 rounded-[6px] bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-black flex items-center justify-center shrink-0 shadow-xs">
                {totalItems}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {viewSubtitle || 'Your private archived gallery and collections'}
            </p>
          </div>
        </div>

        {/* Right: Search Input & Segmented Sort Slider */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60 min-w-[200px]">
            <div className="w-full flex items-center rounded-[14px] bg-slate-50/90 border border-slate-200/90 px-3.5 py-2 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-inner">
              <IconSearch className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search caption, creator..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 font-semibold focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-700 px-1 font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Premium Segmented Sort Control */}
          <div className="relative flex items-center p-1 rounded-[14px] bg-slate-100/90 border border-slate-200/80 shrink-0">
            {(
              [
                { id: 'newest', label: 'Newest' },
                { id: 'oldest', label: 'Oldest' },
                { id: 'favorites', label: '⭐ Favs' },
              ] as const
            ).map((opt) => {
              const isActive = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`relative px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors z-10 cursor-pointer ${
                    isActive
                      ? 'text-indigo-950 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="gallery-sort-indicator"
                      className="absolute inset-0 bg-white rounded-[10px] shadow-sm -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="w-full p-12 sm:p-16 rounded-[24px] bg-white border border-slate-200 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
          <div className="w-14 h-14 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
            <IconPhoto className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            No media found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm font-medium">
            {searchQuery
              ? `No results matching "${searchQuery}". Try a different keyword.`
              : 'Paste links in the Studio to start archiving high-resolution photos and videos.'}
          </p>
        </div>
      ) : (
        /* Timeline Date Grouped Stream with 5-Column Grid */
        <div className="flex flex-col gap-8">
          {dateGroups.map((group, groupIdx) => (
            <div key={group.label} className="flex flex-col gap-3.5">
              
              {/* Sticky Header with Integrated Pagination Controls on Top */}
              <div className="sticky top-16 z-20 pt-1 pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-xl p-2 sm:px-4 sm:py-2.5 rounded-[16px] border border-slate-200/90 shadow-sm">
                  
                  {/* Left: Date Group Indicator */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[8px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <IconCalendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black text-slate-900 font-mono tracking-tight">{group.label}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[11px] text-slate-500 font-mono font-bold">
                      {group.items.length} items
                    </span>
                  </div>

                  {/* Right: Integrated Pagination Bar (Rendered on top group) */}
                  {groupIdx === 0 && totalItems > 0 && (
                    <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                      {/* Per Page Choice */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono hidden md:inline">
                          Show:
                        </span>
                        <div className="relative flex items-center p-0.5 rounded-[10px] bg-slate-100/90 border border-slate-200/80">
                          {PAGE_SIZE_OPTIONS.map((size) => {
                            const isSizeActive = pageSize === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  setPageSize(size);
                                  setCurrentPage(1);
                                }}
                                className={`relative px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                                  isSizeActive ? 'text-indigo-950 font-black' : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {isSizeActive && (
                                  <motion.div
                                    layoutId="pagesize-indicator"
                                    className="absolute inset-0 bg-white rounded-[6px] shadow-xs -z-10"
                                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                  />
                                )}
                                <span>{size}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Compact Page Navigation */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePageChange(safeCurrentPage - 1)}
                          disabled={safeCurrentPage <= 1}
                          className="p-1.5 rounded-[8px] text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Previous Page"
                        >
                          <IconChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="px-2.5 py-0.5 rounded-[6px] bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-black shadow-xs">
                          {safeCurrentPage} / {totalPages}
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePageChange(safeCurrentPage + 1)}
                          disabled={safeCurrentPage >= totalPages}
                          className="p-1.5 rounded-[8px] text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Next Page"
                        >
                          <IconChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* 5-Column Ultra-Modern Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {group.items.map((item) => {
                  const firstFile = item.files?.[0];
                  const previewUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';
                  const isVideo =
                    firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 350, damping: 22 } }}
                      className={`group relative flex flex-col rounded-[20px] bg-white border transition-all overflow-hidden cursor-pointer shadow-sm hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)] ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/25 shadow-md'
                          : 'border-slate-200/90 hover:border-indigo-300/80'
                      }`}
                      onClick={() => onOpenLightbox(item)}
                    >
                      {/* Media Thumbnail Canvas */}
                      <div className="relative aspect-[4/3] w-full bg-slate-100/90 overflow-hidden flex items-center justify-center border-b border-slate-100">
                        {previewUrl ? (
                          isVideo ? (
                            <video
                              src={previewUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt={item.caption || 'Media item'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                              loading="lazy"
                            />
                          )
                        ) : (
                          <div className="text-slate-400 font-mono text-xs">
                            No Preview
                          </div>
                        )}

                        {/* Subtle Ambient Vignette on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Top Left: Multi-Select Checkbox Squircle */}
                        {onToggleSelect && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(item.id);
                            }}
                            className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-[6px] border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white/90 backdrop-blur-md border-slate-300/90 text-transparent hover:border-indigo-500 hover:bg-white'
                            }`}
                            title="Select item"
                          >
                            <IconCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'opacity-0'}`} />
                          </button>
                        )}

                        {/* Top Right: Favorite Star ⭐ Squircle */}
                        {onToggleFavorite && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(item.id);
                            }}
                            className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-[6px] border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                              item.is_favorite
                                ? 'bg-amber-500 border-amber-400 text-white shadow-sm'
                                : 'bg-white/90 backdrop-blur-md border-slate-200/90 text-slate-400 hover:text-amber-500 hover:bg-white'
                            }`}
                            title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {item.is_favorite ? (
                              <IconStarFilled className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <IconStar className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Bottom Left: Platform Squircle Tag */}
                        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 text-[10px] font-mono font-extrabold shadow-sm">
                          {getPlatformIcon(item.platform)}
                          <span className="capitalize">{item.platform}</span>
                        </div>

                        {/* Bottom Right: Media Type Indicators */}
                        <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1">
                          {isVideo && (
                            <div className="flex items-center px-1.5 py-0.5 rounded-[6px] bg-white/95 backdrop-blur-md border border-emerald-200 text-emerald-700 text-[10px] font-mono font-extrabold shadow-sm">
                              <IconVideoCamera className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                          )}

                          {item.files && item.files.length > 1 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-white/95 backdrop-blur-md border border-indigo-200 text-indigo-700 text-[10px] font-mono font-extrabold shadow-sm">
                              <IconLayers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{item.files.length}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Content Footer: Author & Date Only */}
                      <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 bg-white">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {item.username ? `@${item.username}` : 'Archived Media'}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>

                    </motion.div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
