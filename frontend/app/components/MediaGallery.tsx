'use client';

import React, { useState, useMemo } from 'react';
import {
  IconLayers,
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
  error?: string;
}

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Media' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'threads', label: 'Threads' },
];

export function MediaGallery({
  media,
  selectedPlatform,
  onSelectPlatform,
  onOpenLightbox,
  error,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');

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

  // Compute counts per platform
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: media.length };
    media.forEach((item) => {
      const p = item.platform.toLowerCase();
      map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [media]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Search & Platform Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Platform Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#E5EBF2] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] overflow-x-auto no-scrollbar">
          {PLATFORM_FILTERS.map((f) => {
            const count = counts[f.id] || 0;
            const isSelected = selectedPlatform === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectPlatform(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#EEF2F7] text-indigo-600 shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-700 font-extrabold'
                        : 'bg-[#EEF2F7] text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sunken Search Input */}
        <div className="relative min-w-[240px] sm:min-w-[300px]">
          <div className="w-full flex items-center rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] px-3.5 py-2 border border-white/40 focus-within:ring-2 focus-within:ring-indigo-400">
            <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="text-xs text-slate-400 hover:text-slate-700 px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff]">
          {error}
        </div>
      )}

      {/* Media Grid Cards */}
      {filteredMedia.length === 0 ? (
        <div className="rounded-[2rem] bg-[#EEF2F7] shadow-[8px_8px_20px_#cbd5e1,-8px_-8px_20px_#ffffff] border border-white/80 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center mb-3 text-slate-400">
            <IconLayers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-extrabold text-slate-700">No media found in vault</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {searchQuery || selectedPlatform !== 'all'
              ? 'No media matches your filter criteria. Try clearing search or selecting another platform.'
              : 'Download your first social media post from the Studio tab above!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedia.map((item) => {
            const firstFile = item.files?.[0];
            const isVideo = firstFile?.kind === 'video' || Boolean(firstFile?.path?.endsWith('.mp4'));
            const fileCount = item.files?.length || 0;
            const previewUrl = firstFile ? `/api/media/files/${firstFile.id}` : '';

            return (
              <div
                key={item.id}
                onClick={() => onOpenLightbox(item)}
                className="group relative rounded-[1.8rem] bg-[#EEF2F7] shadow-[6px_6px_16px_#cbd5e1,-6px_-6px_16px_#ffffff] border border-white/90 p-3 flex flex-col gap-3 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Media Preview Container */}
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
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      No Preview
                    </div>
                  )}

                  {/* Top Badges (Platform + Carousel Count + Video Badge) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide bg-white/90 backdrop-blur-md text-slate-800 shadow-sm border border-white/80 flex items-center gap-1">
                      {item.platform}
                    </span>

                    <div className="flex items-center gap-1.5">
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
                </div>

                {/* Bottom Card Metadata */}
                <div className="flex flex-col gap-1 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-800 truncate">
                      {item.username ? `@${item.username}` : 'Anonymous'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {item.caption && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
