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
      <div className="p-1.5 sm:p-2 rounded-[2rem] bg-white/40 border border-white/60 shadow-xl backdrop-blur-xl ring-1 ring-black/5">
        <div className="p-5 sm:p-6 rounded-[calc(2rem-0.5rem)] bg-white/80 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <IconUsers className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  Kreator & Akun
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-mono font-black uppercase">
                  Directory
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Jelajahi dan unduh arsip media terorganisir per kreator dan platform
              </p>
            </div>
          </div>

          {/* Global Aggregate Badges */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-panel bg-white/70 text-slate-800 text-xs font-mono font-bold shadow-2xs">
              <span className="text-indigo-600 font-black">{creators.length}</span> Kreator
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-panel bg-white/70 text-slate-800 text-xs font-mono font-bold shadow-2xs">
              <span className="text-emerald-600 font-black">{totalMedia}</span> Total Media
            </div>
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
            aria-label="Cari kreator"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kreator berdasarkan @username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-panel bg-white/70 focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs border border-white/80 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Platform Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs shrink-0 ${
              platformFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'glass-panel hover:bg-white/80 text-slate-700'
            }`}
          >
            Semua ({creators.length})
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
              className="h-48 rounded-[2rem] glass-panel bg-white/40 border border-white/60 animate-pulse"
            />
          ))}
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-[2rem] glass-panel bg-white/40 border border-white/60 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
            <IconUsers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">Tidak ada kreator ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {search ? `Tidak ada kreator cocok dengan "@${search}"` : 'Unduh media untuk melihat kreator di sini'}
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
                className="group relative p-1.5 rounded-[1.75rem] bg-white/40 border border-white/60 hover:border-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                onClick={() => onSelectCreator(creator.username, creator.platform)}
              >
                <div className="p-4 rounded-[calc(1.75rem-0.375rem)] bg-white/80 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] flex flex-col justify-between h-full">
                  <div>
                    {/* Card Top: Avatar Initials + Username + Platform Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Gradient Avatar */}
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-black text-base shadow-sm shrink-0`}
                        >
                          {initial}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate tracking-tight">
                            @{creator.username}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                            {getPlatformIcon(creator.platform)}
                            <span>{creator.platform}</span>
                          </span>
                        </div>
                      </div>

                      {/* Media Count Pill */}
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-mono font-black shadow-2xs shrink-0">
                        {creator.media_count} media
                      </span>
                    </div>

                    {/* Thumbnail Strip Preview */}
                    {creator.sample_thumbnails && creator.sample_thumbnails.length > 0 && (
                      <div className="grid grid-cols-4 gap-1.5 mt-3.5 p-1 rounded-xl bg-slate-900/5 border border-white/70">
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
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 px-0.5">
                      <span>
                        {creator.image_count} foto • {creator.video_count} video
                      </span>
                      {creator.last_posted_at && (
                        <span className="text-slate-400 text-[10px]">
                          {new Date(creator.last_posted_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Buka Koleksi</span>
                      <span>→</span>
                    </span>

                    {/* Quick Export Creator ZIP */}
                    <a
                      href={`/api/media/export/zip?username=${encodeURIComponent(creator.username)}`}
                      onClick={(e) => e.stopPropagation()}
                      download
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-panel bg-white/70 hover:bg-white text-slate-700 hover:text-indigo-700 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                      aria-label={`Export all media from @${creator.username} as ZIP`}
                      title={`Unduh semua media dari @${creator.username} sebagai ZIP`}
                    >
                      <IconFolderZip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ZIP</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
