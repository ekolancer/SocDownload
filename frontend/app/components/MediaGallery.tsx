'use client';

import React, { useState, useMemo, useEffect } from 'react';

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
  IconDownload,
  IconLink,
} from './Icons';
import { MediaItem } from './MediaLightboxModal';

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
  onToggleSidebar?: () => void;
  activePlatformsCount?: number;
  error?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
      return <IconDownload className="w-3.5 h-3.5 text-indigo-600" />;
  }
}

function groupMediaByDate(items: MediaItem[]) {
  const groups: { [key: string]: MediaItem[] } = {};

  items.forEach((item) => {
    let dateKey = 'Recently Added';
    if (item.created_at) {
      const date = new Date(item.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  return Object.keys(groups).map((key) => ({
    date: key,
    items: groups[key],
  }));
}

// Smart Ellipsis Windowing Function (Never overflows screen)
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
  onToggleSidebar,
  activePlatformsCount = 0,
  error,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'favorites'>('newest');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry'>('grid');
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);

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
  }, [searchQuery, sortBy, viewTitle, media.length, pageSize]);

  // Compute Pagination Metrics
  const totalItems = filteredMedia.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMedia = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredMedia.slice(start, start + pageSize);
  }, [filteredMedia, safeCurrentPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalItems);
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);

  const dateGroups = useMemo(() => groupMediaByDate(paginatedMedia), [paginatedMedia]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyLink = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.source_url);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Dynamic Header & Search Bar Toolbar (Glass Panel) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-2xl shadow-sm">
        
        {/* Left: Title, Back Button, and Sidebar Trigger */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                activePlatformsCount > 0
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'glass-panel hover:bg-white/80 text-slate-800'
              }`}
              title="Open Filters & Albums"
            >
              <IconLayers className="w-4 h-4 text-inherit" />
              <span>Filters</span>
              {activePlatformsCount > 0 && (
                <span className="min-w-[18px] h-4.5 px-1.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {activePlatformsCount}
                </span>
              )}
            </button>
          )}

          {onBackToTimeline && (
            <button
              type="button"
              onClick={onBackToTimeline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 glass-panel hover:bg-white/80 transition-all cursor-pointer shrink-0"
            >
              <span>← Back</span>
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                {viewTitle || 'Media Vault'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100/80 text-indigo-700">
                {filteredMedia.length}
              </span>
            </div>
            {viewSubtitle && (
              <span className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {viewSubtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Search Input, Layout Toggle & Sort Dropdown */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions, @users..."
              className="w-full pl-9 pr-8 py-2 rounded-xl glass-panel bg-white/50 focus:bg-white/80 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Layout Mode Switcher (Grid vs Masonry) */}
          <div className="flex items-center glass-panel p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Uniform Grid (4:5 Portrait)"
            >
              <IconPhoto className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('masonry')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layoutMode === 'masonry'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Native Ratio (Masonry Grid)"
            >
              <IconLayers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl glass-panel bg-white/60 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shrink-0 shadow-2xs hover:bg-white/80 transition-all"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="favorites">Favorites First</option>
          </select>
        </div>

      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-14 sm:p-20 rounded-2xl glass-panel text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <IconPhoto className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No media found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery
              ? `No results matching "${searchQuery}". Try different keywords.`
              : 'Download some posts in the Studio tab or import an archive to populate your vault.'}
          </p>
        </div>
      ) : (
        /* Timeline Date-Grouped Media Grid */
        <div className="flex flex-col gap-8">
          {dateGroups.map((group) => (
            <div key={group.date} className="flex flex-col gap-4">
              
              {/* Date Group Header Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full glass-panel text-xs font-bold text-slate-800 shadow-2xs">
                  <IconCalendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{group.date}</span>
                </div>
                <div className="flex-1 h-px bg-white/30" />
              </div>

              {/* Media Cards Grid */}
              <div
                className={`grid gap-4 sm:gap-5 ${
                  layoutMode === 'grid'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                }`}
              >
                {group.items.map((item) => {
                  const firstFile = item.files?.[0];
                  const previewUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';
                  const isVideo =
                    firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));
                  const isSelected = selectedIds.includes(item.id);
                  const isCopied = copiedItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`group relative flex flex-col rounded-xl overflow-hidden glass-panel hover:bg-white/75 p-2 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/50 shadow-md'
                          : 'hover:border-white/80'
                      }`}
                      onClick={() => onOpenLightbox(item)}
                    >
                      {/* Media Thumbnail Canvas */}
                      <div
                        className={`relative w-full bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center shadow-inner ${
                          layoutMode === 'grid' ? 'aspect-[4/5]' : 'aspect-square'
                        }`}
                      >
                        {previewUrl ? (
                          isVideo ? (
                            <video
                              src={previewUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt={item.caption || 'Media item'}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          )
                        ) : (
                          <div className="text-slate-400 font-mono text-xs">
                            No Preview
                          </div>
                        )}

                        {/* Top Left: Multi-Select Checkbox Squircle */}
                        {onToggleSelect && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(item.id);
                            }}
                            className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white/90 border-slate-300 text-transparent hover:border-indigo-500 hover:bg-white'
                            }`}
                            title="Select item"
                          >
                            <IconCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'opacity-0'}`} />
                          </button>
                        )}

                        {/* Top Right: Micro-Action Overlay Strip */}
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Copy URL */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(item, e)}
                            className="w-6 h-6 rounded-lg bg-white/95 text-slate-700 flex items-center justify-center shadow-xs hover:bg-white transition-colors cursor-pointer"
                            title={isCopied ? 'Link Copied!' : 'Copy source link'}
                          >
                            {isCopied ? (
                              <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <IconLink className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </button>

                          {/* Instant Download */}
                          {firstFile && (
                            <a
                              href={`/api/media/files/${firstFile.id}`}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 rounded-lg bg-white/95 text-slate-700 flex items-center justify-center shadow-xs hover:bg-white transition-colors cursor-pointer"
                              title="Download media file"
                            >
                              <IconDownload className="w-3.5 h-3.5 text-slate-600" />
                            </a>
                          )}

                          {/* Favorite Star */}
                          {onToggleFavorite && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(item.id);
                              }}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                item.is_favorite
                                  ? 'bg-amber-500 border-amber-400 text-white shadow-sm'
                                  : 'bg-white/95 border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-white'
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
                        </div>

                        {/* Bottom Left: Platform Squircle Tag */}
                        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/95 text-slate-800 text-[10px] font-mono font-bold shadow-xs">
                          {getPlatformIcon(item.platform)}
                          <span className="capitalize">{item.platform}</span>
                        </div>

                        {/* Bottom Right: Media Type Indicators */}
                        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
                          {isVideo && (
                            <div className="flex items-center px-1.5 py-0.5 rounded-lg bg-white/95 text-emerald-700 text-[10px] font-mono font-bold shadow-xs">
                              <IconVideoCamera className="w-3 h-3 text-emerald-600" />
                            </div>
                          )}

                          {item.files && item.files.length > 1 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/95 text-indigo-700 text-[10px] font-mono font-bold shadow-xs">
                              <IconLayers className="w-3 h-3 text-indigo-600" />
                              <span>{item.files.length}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Content Footer: Author & Date */}
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        {item.username && onSelectCreator ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCreator(item.username!);
                            }}
                            className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate transition-colors text-left cursor-pointer"
                            title={`Filter vault by @${item.username}`}
                          >
                            @{item.username}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.username ? `@${item.username}` : 'Archived Media'}
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Ultra-Premium Glass Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 pb-2 border-t border-white/20">
          
          {/* Left: Summary Metrics Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-panel text-xs text-slate-700 font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>
              Showing <strong className="font-bold text-slate-900">{startIndex}–{endIndex}</strong> of <strong className="font-bold text-slate-900">{totalItems}</strong> items
            </span>
          </div>

          {/* Center: Smart Windowed Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Previous Page Button */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-panel flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-white/80 hover:shadow-md transition-all duration-200 active:scale-95 shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Previous Page"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>

              {/* Number Buttons in Glass Capsule */}
              <div className="flex items-center gap-1 p-1 glass-panel rounded-xl shadow-2xs">
                {visiblePages.map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold text-slate-400 select-none font-mono"
                      >
                        •••
                      </span>
                    );
                  }

                  const pageNum = Number(page);
                  const isActive = pageNum === safeCurrentPage;

                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-105'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white/70 active:scale-95'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-panel flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-white/80 hover:shadow-md transition-all duration-200 active:scale-95 shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Next Page"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right: Custom Per-Page Selector Glass Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel text-xs text-slate-700 font-medium shadow-2xs">
            <span className="text-slate-500 font-medium">Per page:</span>
            <div className="flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
