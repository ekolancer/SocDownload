'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconLayers,
  IconTrash,
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
  error?: string;
}

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
  error,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'favorites'>('newest');

  // Filter media by search query
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

  const dateGroups = useMemo(() => groupMediaByDate(filteredMedia), [filteredMedia]);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Dynamic Header & Search Bar Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-[22px] border border-slate-200/90 shadow-sm">
        
        {/* Title and Back Button */}
        <div className="flex items-center gap-3 min-w-0">
          {onBackToTimeline && (
            <button
              type="button"
              onClick={onBackToTimeline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>← Back</span>
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate tracking-tight">
                {viewTitle || 'Media Vault'}
              </h1>
              {/* Symmetrical Squircle Count Badge */}
              <span className="min-w-[24px] h-6 px-2 rounded-[6px] bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {filteredMedia.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal truncate mt-0.5">
              {viewSubtitle || 'Your private archived gallery and collections'}
            </p>
          </div>
        </div>

        {/* Toolbar: Search Input & Sort Options */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 min-w-[220px]">
            <div className="w-full flex items-center rounded-[12px] bg-slate-50 border border-slate-200/90 px-3 py-1.5 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <IconSearch className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search caption, creator..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-700 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-[12px] bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer shrink-0"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="favorites">⭐ Favorites</option>
          </select>
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
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No results matching "${searchQuery}". Try a different keyword.`
              : 'Paste links in the Studio to start archiving high-resolution photos and videos.'}
          </p>
        </div>
      ) : (
        /* Timeline Date Grouped Stream */
        <div className="flex flex-col gap-8">
          {dateGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-3.5">
              
              {/* Sticky Timeline Header */}
              <div className="sticky top-16 z-20 pt-1 pb-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold font-mono shadow-sm">
                  <IconCalendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{group.label}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-[10px] text-slate-300 font-normal">
                    {group.items.length} items
                  </span>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      className={`group relative flex flex-col rounded-[18px] bg-white border transition-all overflow-hidden cursor-pointer shadow-sm hover:shadow-md ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                      onClick={() => onOpenLightbox(item)}
                    >
                      {/* Media Thumbnail Canvas */}
                      <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                        {previewUrl ? (
                          isVideo ? (
                            <video
                              src={previewUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt={item.caption || 'Media item'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          )
                        ) : (
                          <div className="text-slate-500 font-mono text-xs">
                            No Preview
                          </div>
                        )}

                        {/* Soft Gradient Overlay for badges */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />

                        {/* Top Left: Multi-Select Checkbox Squircle */}
                        {onToggleSelect && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(item.id);
                            }}
                            className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-[6px] border flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                : 'bg-slate-900/60 border-white/40 text-transparent hover:border-white'
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
                            className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-[6px] border flex items-center justify-center transition-all cursor-pointer ${
                              item.is_favorite
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                : 'bg-slate-900/60 border-white/30 text-white/70 hover:text-white hover:border-white'
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
                        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono font-bold">
                          {getPlatformIcon(item.platform)}
                          <span className="capitalize">{item.platform}</span>
                        </div>

                        {/* Bottom Right: Multiple Files / Carousel Squircle Badge */}
                        {item.files && item.files.length > 1 && (
                          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono font-bold">
                            <IconLayers className="w-3 h-3 text-indigo-300" />
                            <span>{item.files.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Content Footer */}
                      <div className="p-3 flex flex-col gap-1 bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.username ? `@${item.username}` : 'Archived Media'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>

                        {item.caption && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal font-normal">
                            {item.caption}
                          </p>
                        )}
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
