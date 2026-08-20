'use client';

import React, { useState, useMemo } from 'react';
import {
  IconSearch,
  IconPlay,
  IconImage,
  IconLayers,
  IconExternalLink,
  IconDownload,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
  IconFacebook,
  IconSparkles,
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
  { id: 'threads', label: 'Threads' },
  { id: 'x', label: 'X' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'facebook', label: 'Facebook' },
];

export function MediaGallery({
  media,
  selectedPlatform,
  onSelectPlatform,
  onOpenLightbox,
  error,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate platform count map
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = { all: media.length };
    media.forEach((item) => {
      const p = item.platform.toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [media]);

  // Filter media by platform and search query
  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      const matchesPlatform =
        selectedPlatform === 'all' || item.platform.toLowerCase() === selectedPlatform.toLowerCase();
      if (!matchesPlatform) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchCaption = item.caption?.toLowerCase().includes(q);
      const matchUser = item.username?.toLowerCase().includes(q);
      const matchUrl = item.source_url.toLowerCase().includes(q);
      return matchCaption || matchUser || matchUrl;
    });
  }, [media, selectedPlatform, searchQuery]);

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <IconInstagram className="w-3.5 h-3.5 text-rose-400" />;
    if (p.includes('threads')) return <IconThreads className="w-3.5 h-3.5 text-slate-200" />;
    if (p.includes('x') || p.includes('twitter')) return <IconX className="w-3.5 h-3.5 text-sky-400" />;
    if (p.includes('tiktok')) return <IconTikTok className="w-3.5 h-3.5 text-teal-300" />;
    if (p.includes('youtube')) return <IconYouTube className="w-3.5 h-3.5 text-red-400" />;
    if (p.includes('reddit')) return <IconReddit className="w-3.5 h-3.5 text-orange-400" />;
    if (p.includes('pinterest')) return <IconPinterest className="w-3.5 h-3.5 text-rose-500" />;
    if (p.includes('facebook')) return <IconFacebook className="w-3.5 h-3.5 text-blue-400" />;
    return <IconImage className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <section className="flex flex-col gap-6">
      {/* Header Bar: Title, Search, and Filter Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Media Vault</h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-white/5 border border-white/10 text-indigo-300">
              {filteredMedia.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Browse and inspect your archived high-res media files
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full bg-[#12141F] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder="Search by caption, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Platform Filter Horizontal Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {PLATFORM_FILTERS.map((p) => {
          const count = platformCounts[p.id] || 0;
          const isSelected = selectedPlatform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPlatform(p.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-[#12141F] text-slate-400 hover:text-slate-200 hover:bg-[#181B2A] border border-white/5'
              }`}
            >
              <span>{p.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-indigo-900/60 text-indigo-100' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-2xl glass-panel border border-white/5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <IconSparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {searchQuery ? 'No matching media found' : 'Your vault is currently empty'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {searchQuery
              ? `No downloaded media matches "${searchQuery}". Try clearing search filter.`
              : 'Paste a post link from Instagram, X, TikTok or threads above to start building your personal media collection.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Media Cards Grid */}
      {filteredMedia.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredMedia.map((item) => {
            const firstFile = item.files[0];
            const hasMultiple = item.files.length > 1;
            const isVideo = firstFile?.kind === 'video';

            return (
              <article
                key={item.id}
                onClick={() => onOpenLightbox(item)}
                className="group relative flex flex-col rounded-2xl bg-[#12141F] border border-white/[0.08] hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Media Thumbnail Container */}
                <div className="relative aspect-square w-full bg-[#08090D] overflow-hidden">
                  {firstFile ? (
                    isVideo ? (
                      <video
                        src={firstFile.url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={firstFile.url}
                        alt={item.caption || `${item.platform} download`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                      No Media File
                    </div>
                  )}

                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                    <div className="flex items-center justify-between">
                      <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-slate-200 uppercase">
                        {item.platform}
                      </div>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Open original link"
                      >
                        <IconExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-200 truncate">
                        {item.username ? `@${item.username}` : 'Post details'}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                        Inspect →
                      </span>
                    </div>
                  </div>

                  {/* Badges on Thumbnail */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                    {isVideo && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 shadow-sm">
                        <IconPlay className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                        <span>VIDEO</span>
                      </span>
                    )}
                    {hasMultiple && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 shadow-sm">
                        <IconLayers className="w-2.5 h-2.5 text-indigo-400" />
                        <span>+{item.files.length}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getPlatformIcon(item.platform)}
                      <span className="text-xs font-bold text-slate-200 truncate font-mono">
                        {item.username ? `@${item.username}` : item.platform}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {item.posted_at
                        ? new Date(item.posted_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Saved'}
                    </span>
                  </div>

                  {item.caption ? (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.caption}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic truncate">{item.source_url}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
