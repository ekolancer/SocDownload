'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconPhoto,
  IconStarFilled,
  IconFolder,
  IconFolderPlus,
  IconUsers,
  IconVideoCamera,
  IconThreads,
  IconClose,
  IconInstagram,
  IconTikTok,
  IconYouTube,
  IconX,
  IconReddit,
  IconPinterest,
  IconCheck,
  IconLayers,
} from './Icons';

export interface AlbumSummary {
  id: number;
  name: string;
  description: string | null;
  items_count: number;
  cover_file_url: string | null;
}

export interface CreatorSummary {
  username: string;
  count: number;
  platforms: string[];
}

export type VaultViewMode =
  | { type: 'timeline' }
  | { type: 'favorites' }
  | { type: 'albums_list' }
  | { type: 'album_detail'; albumId: number; albumName: string }
  | { type: 'creators_list' }
  | { type: 'creator_detail'; username: string }
  | { type: 'type_filter'; kind: 'photo' | 'video' | 'threads' };

export const SUPPORTED_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: IconInstagram, color: 'text-pink-500', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'tiktok', label: 'TikTok', icon: IconTikTok, color: 'text-slate-900', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'threads', label: 'Threads', icon: IconThreads, color: 'text-slate-900', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'youtube', label: 'YouTube', icon: IconYouTube, color: 'text-red-500', bg: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'x', label: 'X (Twitter)', icon: IconX, color: 'text-slate-900', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'reddit', label: 'Reddit', icon: IconReddit, color: 'text-orange-500', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'pinterest', label: 'Pinterest', icon: IconPinterest, color: 'text-red-600', bg: 'bg-red-50 text-red-700 border-red-200' },
];

interface VaultSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: VaultViewMode;
  onSelectView: (view: VaultViewMode) => void;
  totalMediaCount: number;
  favoritesCount: number;
  albums: AlbumSummary[];
  creators: CreatorSummary[];
  platformCounts: Record<string, number>;
  selectedPlatforms: string[];
  onTogglePlatform: (platformId: string) => void;
  onSelectAllPlatforms: () => void;
  onClearPlatforms: () => void;
  onOpenCreateAlbum: () => void;
}

export function VaultSidebar({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  totalMediaCount,
  favoritesCount,
  albums,
  creators,
  platformCounts,
  selectedPlatforms,
  onTogglePlatform,
  onSelectAllPlatforms,
  onClearPlatforms,
  onOpenCreateAlbum,
}: VaultSidebarProps) {
  const isTimelineActive = currentView.type === 'timeline';
  const isFavoritesActive = currentView.type === 'favorites';
  const isCreatorsActive = currentView.type === 'creators_list' || currentView.type === 'creator_detail';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Frosted Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-y-0 left-0 w-80 max-w-[88vw] bg-white/95 backdrop-blur-2xl border-r border-slate-200/90 shadow-2xl p-5 flex flex-col justify-between z-50 overflow-hidden"
          >
            {/* Header with Title and Close Button */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
                  <IconLayers className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-900 leading-none">
                    Vault Filters & Albums
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Collections & Platforms
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-[7px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                title="Close Sidebar"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 pr-1 no-scrollbar flex flex-col gap-4 text-sm">
              
              {/* 1. Core Navigation Library */}
              <div className="flex flex-col gap-1 p-2 rounded-[18px] bg-slate-50/70 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono px-3 pt-1 pb-0.5">
                  Library
                </span>

                {/* Timeline */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectView({ type: 'timeline' });
                    onClose();
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                    isTimelineActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconPhoto className={`w-4 h-4 shrink-0 ${isTimelineActive ? 'text-white' : 'text-indigo-600'}`} />
                    <span>All Timeline</span>
                  </div>
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-[5px] flex items-center justify-center text-[10px] font-mono font-bold ${
                      isTimelineActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {totalMediaCount}
                  </span>
                </button>

                {/* Favorites */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectView({ type: 'favorites' });
                    onClose();
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                    isFavoritesActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconStarFilled className={`w-4 h-4 shrink-0 ${isFavoritesActive ? 'text-white' : 'text-amber-500'}`} />
                    <span>Favorites ⭐</span>
                  </div>
                  {favoritesCount > 0 && (
                    <span
                      className={`min-w-[20px] h-5 px-1.5 rounded-[5px] flex items-center justify-center text-[10px] font-mono font-bold ${
                        isFavoritesActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {favoritesCount}
                    </span>
                  )}
                </button>

                {/* Creators Hub */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectView({ type: 'creators_list' });
                    onClose();
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                    isCreatorsActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconUsers className={`w-4 h-4 shrink-0 ${isCreatorsActive ? 'text-white' : 'text-indigo-600'}`} />
                    <span>Creators Hub</span>
                  </div>
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-[5px] flex items-center justify-center text-[10px] font-mono font-bold ${
                      isCreatorsActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {creators.length}
                  </span>
                </button>
              </div>

              {/* 2. Multi-Select Social Media Platforms Filter */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-[18px] bg-slate-50/70 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                    Platforms
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedPlatforms.length > 0 ? (
                      <button
                        type="button"
                        onClick={onClearPlatforms}
                        className="text-[10px] font-mono font-bold text-indigo-600 hover:underline px-1 py-0.5"
                      >
                        Clear ({selectedPlatforms.length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onSelectAllPlatforms}
                        className="text-[10px] font-mono text-slate-400 hover:text-indigo-600 px-1 py-0.5"
                      >
                        Select All
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {SUPPORTED_PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const isChecked = selectedPlatforms.includes(platform.id);
                    const count = platformCounts[platform.id] || 0;

                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => onTogglePlatform(platform.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50 text-indigo-950 border border-indigo-200'
                            : 'text-slate-600 hover:bg-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <IconCheck className="w-3 h-3 text-white" />}
                          </div>

                          <Icon className={`w-3.5 h-3.5 shrink-0 ${platform.color}`} />
                          <span className="truncate">{platform.label}</span>
                        </div>

                        <span
                          className={`min-w-[18px] h-4.5 px-1 rounded-[5px] flex items-center justify-center text-[10px] font-mono font-bold ${
                            isChecked
                              ? 'bg-indigo-200/80 text-indigo-900'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Custom Albums */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-[18px] bg-slate-50/70 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                    Albums ({albums.length})
                  </span>
                  <button
                    type="button"
                    onClick={onOpenCreateAlbum}
                    className="w-5 h-5 rounded-[5px] text-indigo-600 hover:bg-indigo-50 border border-indigo-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Create New Album"
                  >
                    <IconFolderPlus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
                  {albums.length === 0 ? (
                    <div className="px-2 py-2 text-center text-xs text-slate-400">
                      <span>No albums yet</span>
                    </div>
                  ) : (
                    albums.map((album) => {
                      const isSelected =
                        currentView.type === 'album_detail' && currentView.albumId === album.id;
                      return (
                        <button
                          key={album.id}
                          type="button"
                          onClick={() => {
                            onSelectView({
                              type: 'album_detail',
                              albumId: album.id,
                              albumName: album.name,
                            });
                            onClose();
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm font-bold'
                              : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <IconFolder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                            <span className="truncate">{album.name}</span>
                          </div>
                          <span
                            className={`min-w-[18px] h-4.5 px-1 rounded-[5px] flex items-center justify-center text-[10px] font-mono font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {album.items_count}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Media Categories */}
              <div className="flex flex-col gap-1 p-2 rounded-[18px] bg-slate-50/70 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono px-3 pt-1 pb-0.5">
                  Type
                </span>

                <button
                  type="button"
                  onClick={() => {
                    onSelectView({ type: 'type_filter', kind: 'photo' });
                    onClose();
                  }}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                    currentView.type === 'type_filter' && currentView.kind === 'photo'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <IconPhoto className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Photos & Stills</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectView({ type: 'type_filter', kind: 'video' });
                    onClose();
                  }}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                    currentView.type === 'type_filter' && currentView.kind === 'video'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <IconVideoCamera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Reels & Videos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectView({ type: 'type_filter', kind: 'threads' });
                    onClose();
                  }}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                    currentView.type === 'type_filter' && currentView.kind === 'threads'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <IconThreads className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>Threads & Notes</span>
                </button>
              </div>

            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
