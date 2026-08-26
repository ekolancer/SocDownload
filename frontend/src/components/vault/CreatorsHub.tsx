'use client';

import React, { useState, useMemo } from 'react';
import {
  IconSearch,
  IconInstagram,
  IconTikTok,
  IconThreads,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconSparkles,
  IconFolderZip,
  IconUsers,
} from '@/components/ui/Icons';

export interface CreatorStats {
  username: string;
  platform: string;
  media_count: number;
  video_count: number;
  image_count: number;
  first_posted_at: string | null;
  last_posted_at: string | null;
  sample_thumbnails: number[];
}

interface CreatorsHubProps {
  creators: CreatorStats[];
  loading?: boolean;
  onSelectCreator: (username: string, platform?: string) => void;
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <IconInstagram className="w-3.5 h-3.5 text-pink-600" />;
    case 'threads':
      return <IconThreads className="w-3.5 h-3.5 text-slate-900" />;
    case 'tiktok':
      return <IconTikTok className="w-3.5 h-3.5 text-slate-900" />;
    case 'youtube':
      return <IconYouTube className="w-3.5 h-3.5 text-red-600" />;
    case 'x':
      return <IconX className="w-3.5 h-3.5 text-slate-900" />;
    case 'reddit':
      return <IconReddit className="w-3.5 h-3.5 text-orange-600" />;
    case 'pinterest':
      return <IconPinterest className="w-3.5 h-3.5 text-red-600" />;
    default:
      return <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />;
  }
}

function getPlatformGradient(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'from-fuchsia-600 via-pink-600 to-amber-500';
    case 'threads':
      return 'from-slate-900 to-slate-700';
    case 'tiktok':
      return 'from-cyan-500 via-slate-900 to-rose-500';
    case 'youtube':
      return 'from-red-600 to-rose-700';
    case 'x':
      return 'from-slate-900 to-sky-600';
    case 'reddit':
      return 'from-orange-500 to-red-600';
    case 'pinterest':
      return 'from-red-500 to-pink-600';
    default:
      return 'from-indigo-600 to-purple-600';
  }
}

export function CreatorsHub({ creators, loading, onSelectCreator }: CreatorsHubProps) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      const matchSearch = c.username.toLowerCase().includes(search.toLowerCase());
      const matchPlatform = platformFilter === 'all' || c.platform.toLowerCase() === platformFilter.toLowerCase();
      return matchSearch && matchPlatform;
    });
  }, [creators, search, platformFilter]);

  const totalMedia = useMemo(() => {
    return creators.reduce((sum, c) => sum + c.media_count, 0);
  }, [creators]);

  const platforms = useMemo(() => {
    const pSet = new Set(creators.map((c) => c.platform.toLowerCase()));
    return Array.from(pSet);
  }, [creators]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Quick Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl glass-panel shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
            <IconUsers className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Creators Hub
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Browse, filter, and export archived media aggregated by author & channel
            </p>
          </div>
        </div>

        {/* Global Aggregate Badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-panel bg-white/70 text-slate-800 text-xs font-mono font-bold shadow-2xs">
            <span className="text-indigo-600 font-black">{creators.length}</span> Creators
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-panel bg-white/70 text-slate-800 text-xs font-mono font-bold shadow-2xs">
            <span className="text-emerald-600 font-black">{totalMedia}</span> Total Items
          </div>
        </div>
      </div>

      {/* 2. Controls: Search Bar & Platform Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creator by @username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-panel bg-white/50 focus:bg-white/80 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Platform Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
              platformFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'glass-panel hover:bg-white/80 text-slate-700'
            }`}
          >
            All Platforms ({creators.length})
          </button>
          {platforms.map((p) => {
            const count = creators.filter((c) => c.platform.toLowerCase() === p).length;
            const active = platformFilter === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatformFilter(p)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'glass-panel hover:bg-white/80 text-slate-700'
                }`}
              >
                {getPlatformIcon(p)}
                <span className="capitalize">{p}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Creator Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl glass-panel animate-pulse"
            />
          ))}
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl glass-panel text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <IconUsers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No creators found</h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {search ? `No creator matching "@${search}"` : 'Archive posts to see creators here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreators.map((creator) => {
            const initial = (creator.username[0] || 'C').toUpperCase();
            const gradient = getPlatformGradient(creator.platform);

            return (
              <div
                key={`${creator.platform}-${creator.username}`}
                className="group relative flex flex-col justify-between rounded-2xl glass-panel hover:bg-white/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                onClick={() => onSelectCreator(creator.username, creator.platform)}
              >
                <div>
                  {/* Card Top: Avatar Initials + Username + Platform Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Gradient Avatar */}
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0`}
                      >
                        {initial}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            @{creator.username}
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                          {getPlatformIcon(creator.platform)}
                          <span>{creator.platform}</span>
                        </span>
                      </div>
                    </div>

                    {/* Media Count Pill */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-700 text-xs font-mono font-bold shadow-2xs">
                        {creator.media_count} items
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Strip Preview */}
                  {creator.sample_thumbnails && creator.sample_thumbnails.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-4 p-1.5 rounded-xl bg-white/50 border border-white/60">
                      {creator.sample_thumbnails.slice(0, 4).map((fileId) => (
                        <div
                          key={fileId}
                          className="relative aspect-square rounded-lg bg-slate-950 overflow-hidden"
                        >
                          <img
                            src={`/api/media/files/${fileId}`}
                            alt={creator.username}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Details stats: videos vs photos */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3.5 px-0.5">
                    <span>
                      {creator.image_count} photos • {creator.video_count} videos
                    </span>
                    {creator.last_posted_at && (
                      <span className="text-slate-400 text-[10px]">
                        Last: {new Date(creator.last_posted_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                      </span>
                    )}

                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-3.5 mt-3.5 border-t border-white/40">
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:underline">
                    <span>View Archive</span>
                    <span>→</span>
                  </span>

                  {/* Quick Export Creator ZIP */}
                  <a
                    href={`/api/media/export/zip?username=${encodeURIComponent(creator.username)}`}
                    onClick={(e) => e.stopPropagation()}
                    download
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-panel hover:bg-white text-slate-700 hover:text-indigo-700 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-2xs"
                    title={`Export all media from @${creator.username} as ZIP`}
                  >
                    <IconFolderZip className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ZIP</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
