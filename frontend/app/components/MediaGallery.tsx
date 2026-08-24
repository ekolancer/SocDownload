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

  const handleCopyLink = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.source_url);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Dynamic Header & Search Bar Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
            >
              <span>← Back</span>
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate tracking-tight">
                {viewTitle || 'Media Vault'}
              </h2>
              <span className="px-2 py-0.5 rounded-[6px] text-xs font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                {filteredMedia.length}
              </span>
            </div>
            {viewSubtitle && (
              <span className="text-xs text-slate-400 font-medium truncate mt-0.5">
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
              className="w-full pl-9 pr-8 py-2 rounded-[12px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
          <div className="flex items-center bg-slate-100 p-1 rounded-[12px] border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`px-2.5 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Uniform 4:5 Portrait Grid"
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('masonry')}
              className={`px-2.5 py-1 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                layoutMode === 'masonry'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Native Aspect Ratio Grid"
            >
              Masonry
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-[12px] px-3 py-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="favorites">⭐ Favorites</option>
            </select>
          </div>
        </div>

      </div>

      {/* Media Content Stream */}
      {error && (
        <div className="p-4 rounded-[16px] bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-[24px] bg-white border border-slate-200/90 text-center">
          <div className="w-14 h-14 rounded-[18px] bg-indigo-50 text-indigo-500 border border-indigo-100 flex items-center justify-center mb-3.5 shadow-2xs">
            <IconPhoto className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No media found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm font-medium">
            {searchQuery
              ? `No media matching "${searchQuery}". Try a different keyword.`
              : 'Your vault is currently empty. Start downloading or import your legacy archives!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {dateGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-3.5">
              
              {/* Date Header Pill */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-white border border-slate-200/90 text-slate-700 text-xs font-bold font-mono shadow-2xs">
                  <IconCalendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{group.label}</span>
                  <span className="text-slate-400 text-[10px]">({group.items.length})</span>
                </div>
                <div className="flex-1 h-px bg-slate-200/80" />
              </div>

              {/* Responsive 5-Column Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
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
                      style={{ willChange: 'box-shadow, border-color' }}
                      className={`group relative flex flex-col rounded-[20px] bg-white border overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200 ease-out ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/25 shadow-md'
                          : 'border-slate-200/90 hover:border-indigo-300/80'
                      }`}
                      onClick={() => onOpenLightbox(item)}
                    >
                      {/* Media Thumbnail Canvas */}
                      <div
                        className={`relative w-full bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-100 ${
                          layoutMode === 'grid' ? 'aspect-[4/5]' : 'aspect-square'
                        }`}
                      >
                        {previewUrl ? (
                          isVideo ? (
                            // Static thumbnail — no hover autoplay to prevent re-render flicker
                            <video
                              src={previewUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt={item.caption || 'Media item'}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )
                        ) : (
                          <div className="text-slate-400 font-mono text-xs">
                            No Preview
                          </div>
                        )}

                        {/* Subtle Ambient Vignette on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

                        {/* Top Left: Multi-Select Checkbox Squircle */}
                        {onToggleSelect && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(item.id);
                            }}
                            className={`absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-[7px] border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-slate-300/90 text-transparent hover:border-indigo-500'
                            }`}
                            title="Select item"
                          >
                            <IconCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'opacity-0'}`} />
                          </button>
                        )}

                        {/* Top Right: Micro-Action Overlay Strip (Favorite, Download, Copy Link) */}
                        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Copy URL */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(item, e)}
                            className="w-6 h-6 rounded-[7px] bg-white text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
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
                              className="w-6 h-6 rounded-[7px] bg-white text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
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
                              className={`w-6 h-6 rounded-[7px] border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                item.is_favorite
                                  ? 'bg-amber-500 border-amber-400 text-white shadow-sm'
                                  : 'bg-white border-slate-200/90 text-slate-400 hover:text-amber-500'
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
                        <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-[7px] bg-white border border-slate-200/90 text-slate-800 text-[10px] font-mono font-extrabold shadow-sm">
                          {getPlatformIcon(item.platform)}
                          <span className="capitalize">{item.platform}</span>
                        </div>

                        {/* Bottom Right: Media Type Indicators */}
                        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1">
                          {isVideo && (
                            <div className="flex items-center px-1.5 py-0.5 rounded-[7px] bg-white border border-emerald-200 text-emerald-700 text-[10px] font-mono font-extrabold shadow-sm">
                              <IconVideoCamera className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                          )}

                          {item.files && item.files.length > 1 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[7px] bg-white border border-indigo-200 text-indigo-700 text-[10px] font-mono font-extrabold shadow-sm">
                              <IconLayers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{item.files.length}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Content Footer: Author & Date */}
                      <div className="p-3 flex items-center justify-between gap-2 bg-white">
                        {item.username && onSelectCreator ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCreator(item.username!);
                            }}
                            className="text-xs font-black text-slate-900 hover:text-indigo-600 truncate transition-colors text-left cursor-pointer"
                            title={`Filter vault by @${item.username}`}
                          >
                            @{item.username}
                          </button>
                        ) : (
                          <span className="text-xs font-black text-slate-900 truncate">
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

      {/* Pagination Footer Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1 rounded-[8px] bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              className="w-7 h-7 rounded-[7px] text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 aspect-square"
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
              className="w-7 h-7 rounded-[7px] text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 aspect-square"
              title="Next Page"
            >
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
