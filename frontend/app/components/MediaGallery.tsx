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
} from './Icons';
import { MediaItem } from './MediaLightboxModal';

interface MediaGalleryProps {
  media: MediaItem[];
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
  onOpenLightbox: (item: MediaItem) => void;
  onDeleteItem?: (id: number) => Promise<void>;
  onToggleFavorite?: (id: number) => Promise<void>;
  selectedIds: number[];
  onToggleSelect: (id: number, e?: React.MouseEvent) => void;
  onSelectAll?: () => void;
  viewTitle?: string;
  viewSubtitle?: string;
  onBackToTimeline?: () => void;
  error?: string;
}

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'threads', label: 'Threads' },
];

function formatTimelineDate(dateStr?: string | null): string {
  if (!dateStr) return 'Earlier Archives';
  const d = new Date(dateStr);
  const now = new Date();

  if (d.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function MediaGallery({
  media,
  selectedPlatform,
  onSelectPlatform,
  onOpenLightbox,
  onDeleteItem,
  onToggleFavorite,
  selectedIds,
  onToggleSelect,
  viewTitle,
  viewSubtitle,
  onBackToTimeline,
  error,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter and search logic
  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      if (selectedPlatform !== 'all' && item.platform.toLowerCase() !== selectedPlatform) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inCaption = item.caption?.toLowerCase().includes(q);
        const inUsername = item.username?.toLowerCase().includes(q);
        const inUrl = item.source_url?.toLowerCase().includes(q);
        const inTags = item.hashtags?.toLowerCase().includes(q);
        return inCaption || inUsername || inUrl || inTags;
      }
      return true;
    });
  }, [media, selectedPlatform, searchQuery]);

  // Group media by Timeline Date Headers
  const groupedTimeline = useMemo(() => {
    const groups: { label: string; items: MediaItem[] }[] = [];
    const map = new Map<string, MediaItem[]>();

    filteredMedia.forEach((item) => {
      const label = formatTimelineDate(item.created_at || item.posted_at);
      if (!map.has(label)) {
        map.set(label, []);
        groups.push({ label, items: map.get(label)! });
      }
      map.get(label)!.push(item);
    });

    return groups;
  }, [filteredMedia]);

  // Counts per platform
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: media.length };
    media.forEach((item) => {
      const p = item.platform.toLowerCase();
      map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [media]);

  const handleDelete = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (!onDeleteItem) return;
    if (confirm(`Hapus media ini dari vault dan storage disk?`)) {
      setDeletingId(item.id);
      try {
        await onDeleteItem(item.id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleFavorite = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (!onToggleFavorite) return;
    await onToggleFavorite(item.id);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* View Header (If Custom View like Album / Creator) */}
      {viewTitle && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200/90 m3-elevation-1"
        >
          <div className="flex items-center gap-3.5">
            {onBackToTimeline && (
              <button
                onClick={onBackToTimeline}
                className="px-3.5 py-1.5 rounded-full text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                ← Back
              </button>
            )}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {viewTitle}
              </h2>
              {viewSubtitle && (
                <p className="text-xs text-slate-500 font-mono mt-0.5 leading-relaxed">
                  {viewSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 self-start sm:self-auto">
            {filteredMedia.length} Items
          </div>
        </motion.div>
      )}

      {/* Search & Platform Filter Controls: M3 Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Platform Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-200/60 border border-slate-300/60 overflow-x-auto no-scrollbar">
          {PLATFORM_FILTERS.map((f) => {
            const count = counts[f.id] || 0;
            const isSelected = selectedPlatform === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectPlatform(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-indigo-950 m3-elevation-1 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* M3 Search Input Bar */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <div className="w-full flex items-center rounded-full bg-white border border-slate-200/90 m3-elevation-1 px-4 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <IconSearch className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions, author, or URL..."
              className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-700 px-1.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
          {error}
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200/90 m3-elevation-1 p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
            <IconLayers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 leading-snug">No media found in vault</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
            {searchQuery || selectedPlatform !== 'all'
              ? 'No media matches your filter criteria. Try clearing search or selecting another platform.'
              : 'Download your first social media post from the Studio tab above!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groupedTimeline.map((group) => (
            <div key={group.label} className="flex flex-col gap-3">
              
              {/* Sticky Timeline Date Header */}
              <div className="sticky top-16 z-10 py-2 flex items-center gap-3 bg-slate-50/90 backdrop-blur-md">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 m3-elevation-1">
                  <IconCalendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900 font-sans">
                    {group.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold ml-1">
                    ({group.items.length})
                  </span>
                </div>
                <div className="flex-1 h-px bg-slate-200/80" />
              </div>

              {/* Cards Grid: M3 Elevated Media Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <AnimatePresence>
                  {group.items.map((item) => {
                    const firstFile = item.files?.[0];
                    const isVideo = firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));
                    const fileCount = item.files?.length || 0;
                    const previewUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';
                    const isDeleting = deletingId === item.id;
                    const isSelected = selectedIds.includes(item.id);
                    const isFav = Boolean(item.is_favorite);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        whileHover={{ y: -4 }}
                        onClick={(e) => {
                          if (selectedIds.length > 0) {
                            onToggleSelect(item.id, e);
                          } else {
                            onOpenLightbox(item);
                          }
                        }}
                        className={`group relative rounded-3xl bg-white border transition-all duration-200 cursor-pointer overflow-hidden p-3 flex flex-col gap-3 ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-500/30 m3-elevation-3 bg-indigo-50/20'
                            : 'border-slate-200/90 m3-elevation-1 hover:m3-elevation-2'
                        } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                      >
                        {/* Media Preview Box */}
                        <div className="relative aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden">
                          {previewUrl ? (
                            isVideo ? (
                              <video
                                src={previewUrl}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={previewUrl}
                                alt={item.caption || item.username || 'Media Preview'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-mono p-4 text-center">
                              📄 Text Archive
                            </div>
                          )}

                          {/* Top-Left Selection Checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(item.id, e);
                            }}
                            className={`absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white m3-elevation-2'
                                : 'bg-white/90 backdrop-blur-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-indigo-600 m3-elevation-1'
                            }`}
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            <IconCheck className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                          </div>

                          {/* Top-Right Badges & Actions */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-auto">
                            {/* Favorite Button */}
                            {onToggleFavorite && (
                              <button
                                type="button"
                                onClick={(e) => handleFavorite(e, item)}
                                className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                                  isFav
                                    ? 'bg-amber-50 text-amber-500 border border-amber-200 m3-elevation-1'
                                    : 'bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-white m3-elevation-1'
                                }`}
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                {isFav ? (
                                  <IconStarFilled className="w-3.5 h-3.5" />
                                ) : (
                                  <IconStar className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            {onDeleteItem && (
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, item)}
                                className="p-1.5 rounded-full bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 m3-elevation-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Delete from vault & disk"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Bottom-Right Video / Count Badge */}
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 pointer-events-none">
                            {fileCount > 1 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-900/80 backdrop-blur-md text-white font-mono">
                                +{fileCount - 1}
                              </span>
                            )}
                            {isVideo && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-600/90 backdrop-blur-md text-white">
                                VIDEO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Card Content */}
                        <div className="flex flex-col gap-1 px-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                              {item.username ? `@${item.username}` : 'Anonymous'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono shrink-0">
                              {item.platform}
                            </span>
                          </div>

                          {item.caption && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                              {item.caption}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
