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
  IconUser,
  IconFolder,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
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

  // If today
  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }

  // If yesterday
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Month Year
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
  onSelectAll,
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
      // Platform filter
      if (selectedPlatform !== 'all' && item.platform.toLowerCase() !== selectedPlatform) {
        return false;
      }
      // Search query filter
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

  // Compute counts per platform
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
    <div className="flex flex-col gap-8 w-full">
      
      {/* View Header (If custom view such as Album Detail or Creator Detail) */}
      {viewTitle && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[2rem] bg-[#EEF2F7] shadow-[6px_6px_16px_#cbd5e1,-6px_-6px_16px_#ffffff] border border-white/90"
        >
          <div className="flex items-center gap-3.5">
            {onBackToTimeline && (
              <button
                onClick={onBackToTimeline}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-[#E5EBF2] shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff] text-xs font-bold transition-all cursor-pointer"
              >
                ← Back
              </button>
            )}
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">
                {viewTitle}
              </h2>
              {viewSubtitle && (
                <p className="text-xs text-slate-500 font-mono mt-0.5 leading-relaxed">
                  {viewSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-slate-600 bg-[#E5EBF2] px-3.5 py-1.5 rounded-xl shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] self-start sm:self-auto">
            {filteredMedia.length} Items
          </div>
        </motion.div>
      )}

      {/* Search & Platform Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
        
        {/* Platform Filter Pills */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] overflow-x-auto no-scrollbar">
          {PLATFORM_FILTERS.map((f) => {
            const count = counts[f.id] || 0;
            const isSelected = selectedPlatform === f.id;
            return (
              <motion.button
                key={f.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectPlatform(f.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#EEF2F7] text-indigo-600 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-700 font-extrabold'
                        : 'bg-[#EEF2F7] text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Sunken Search Input */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <div className="w-full flex items-center rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_7px_#cbd5e1,inset_-3px_-3px_7px_#ffffff] px-4 py-2.5 border border-white/40 focus-within:ring-2 focus-within:ring-indigo-400">
            <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] leading-relaxed">
          {error}
        </div>
      )}

      {/* Media Grid / Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="rounded-[2.4rem] bg-[#EEF2F7] shadow-[10px_10px_24px_#cbd5e1,-10px_-10px_24px_#ffffff] border border-white/80 p-16 flex flex-col items-center justify-center text-center">
          <div className="w-18 h-18 rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center mb-4 text-slate-400">
            <IconLayers className="w-9 h-9 text-slate-400" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-700 leading-snug">No media found in vault</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
            {searchQuery || selectedPlatform !== 'all'
              ? 'No media matches your filter criteria. Try clearing search or selecting another platform.'
              : 'Download your first social media post from the Studio tab above!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groupedTimeline.map((group) => (
            <div key={group.label} className="flex flex-col gap-4">
              
              {/* Sticky Timeline Date Header */}
              <div className="sticky top-16 z-10 py-2.5 flex items-center gap-3 bg-[#EEF2F7]/90 backdrop-blur-md">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#E5EBF2] shadow-[inset_1px_1px_3px_#cbd5e1,inset_-1px_-1px_3px_#ffffff] border border-white/60">
                  <IconCalendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-extrabold text-slate-800 font-sans">
                    {group.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold ml-1">
                    ({group.items.length})
                  </span>
                </div>
                <div className="flex-1 h-px bg-slate-200/80" />
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {group.items.map((item, idx) => {
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
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.4, delay: (idx % 6) * 0.04, ease: [0.32, 0.72, 0, 1] }}
                        whileHover={{ y: -5 }}
                        onClick={(e) => {
                          if (selectedIds.length > 0) {
                            onToggleSelect(item.id, e);
                          } else {
                            onOpenLightbox(item);
                          }
                        }}
                        className={`group relative rounded-[2rem] bg-[#EEF2F7] border transition-all duration-300 cursor-pointer overflow-hidden p-3 flex flex-col gap-3 ${
                          isSelected
                            ? 'shadow-[inset_4px_4px_10px_#cbd5e1,inset_-4px_-4px_10px_#ffffff] border-indigo-500 ring-2 ring-indigo-400'
                            : 'shadow-[6px_6px_16px_#cbd5e1,-6px_-6px_16px_#ffffff] border-white/90'
                        } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                      >
                        {/* Media Preview Box */}
                        <div className="relative aspect-square w-full rounded-2xl bg-[#E5EBF2] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] overflow-hidden">
                          {previewUrl ? (
                            isVideo ? (
                              <video
                                src={previewUrl}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={previewUrl}
                                alt={item.caption || item.username || 'Media Preview'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                            className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white/80 backdrop-blur-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-indigo-600'
                            }`}
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            <IconCheck className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                          </div>

                          {/* Top-Right Badges & Favorite Button */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
                            {/* Favorite ⭐ Button */}
                            {onToggleFavorite && (
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={(e) => handleFavorite(e, item)}
                                className={`p-1.5 rounded-xl backdrop-blur-md border shadow-sm transition-all cursor-pointer ${
                                  isFav
                                    ? 'bg-amber-50/95 border-amber-200 text-amber-500'
                                    : 'bg-white/80 border-white/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-white'
                                }`}
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                {isFav ? (
                                  <IconStarFilled className="w-3.5 h-3.5" />
                                ) : (
                                  <IconStar className="w-3.5 h-3.5" />
                                )}
                              </motion.button>
                            )}

                            {/* Delete Button */}
                            {onDeleteItem && (
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={(e) => handleDelete(e, item)}
                                className="p-1.5 rounded-xl bg-white/80 hover:bg-rose-50 text-slate-400 hover:text-rose-600 shadow-sm border border-white/80 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Delete from vault & disk"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </motion.button>
                            )}
                          </div>

                          {/* Bottom-Right Video / Carousel Count Badge */}
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 pointer-events-none">
                            {fileCount > 1 && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-900/80 backdrop-blur-md text-white shadow-sm font-mono">
                                +{fileCount - 1}
                              </span>
                            )}
                            {isVideo && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-600/90 backdrop-blur-md text-white shadow-sm">
                                VIDEO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Metadata */}
                        <div className="flex flex-col gap-1 px-1 pb-0.5">
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
