'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  IconPhoto,
  IconStarFilled,
  IconFolder,
  IconFolderPlus,
  IconUsers,
  IconUser,
  IconVideoCamera,
  IconThreads,
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

interface VaultSidebarProps {
  currentView: VaultViewMode;
  onSelectView: (view: VaultViewMode) => void;
  totalMediaCount: number;
  favoritesCount: number;
  albums: AlbumSummary[];
  creators: CreatorSummary[];
  onOpenCreateAlbum: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function VaultSidebar({
  currentView,
  onSelectView,
  totalMediaCount,
  favoritesCount,
  albums,
  creators,
  onOpenCreateAlbum,
  isOpenMobile,
  onCloseMobile,
}: VaultSidebarProps) {
  const isTimelineActive = currentView.type === 'timeline';
  const isFavoritesActive = currentView.type === 'favorites';
  const isAlbumsActive = currentView.type === 'albums_list' || currentView.type === 'album_detail';
  const isCreatorsActive = currentView.type === 'creators_list' || currentView.type === 'creator_detail';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Enclosure */}
      <aside
        className={`fixed lg:sticky top-20 left-0 z-40 lg:z-10 h-[calc(100vh-5.5rem)] w-72 shrink-0 flex flex-col justify-between p-4 bg-[#EEF2F7] lg:bg-transparent border-r lg:border-r-0 border-slate-200/80 transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 no-scrollbar">
          
          {/* Main Views Navigation Group */}
          <div className="flex flex-col gap-1.5 p-2 rounded-[1.8rem] bg-[#EEF2F7] shadow-[6px_6px_14px_#cbd5e1,-6px_-6px_14px_#ffffff] border border-white/80">
            
            {/* 1. Timeline (All Media) */}
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSelectView({ type: 'timeline' });
                onCloseMobile();
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                isTimelineActive
                  ? 'bg-[#E5EBF2] text-indigo-600 shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconPhoto className="w-4 h-4 text-indigo-500" />
                <span>Photos & Timeline</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#EEF2F7] text-slate-500 font-bold">
                {totalMediaCount}
              </span>
            </motion.button>

            {/* 2. Favorites */}
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSelectView({ type: 'favorites' });
                onCloseMobile();
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                isFavoritesActive
                  ? 'bg-[#E5EBF2] text-amber-600 shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconStarFilled className="w-4 h-4 text-amber-500" />
                <span>Favorites ⭐</span>
              </div>
              {favoritesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-50 text-amber-700 font-bold border border-amber-200/60">
                  {favoritesCount}
                </span>
              )}
            </motion.button>

            {/* 3. Creators Hub */}
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSelectView({ type: 'creators_list' });
                onCloseMobile();
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                isCreatorsActive
                  ? 'bg-[#E5EBF2] text-indigo-600 shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconUsers className="w-4 h-4 text-indigo-500" />
                <span>Creators Hub</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#EEF2F7] text-slate-500 font-bold">
                {creators.length}
              </span>
            </motion.button>
          </div>

          {/* Albums Section */}
          <div className="flex flex-col gap-2.5 p-3 rounded-[1.8rem] bg-[#EEF2F7] shadow-[6px_6px_14px_#cbd5e1,-6px_-6px_14px_#ffffff] border border-white/80">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                My Albums ({albums.length})
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={onOpenCreateAlbum}
                className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] cursor-pointer"
                title="Create New Album"
              >
                <IconFolderPlus className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
              {albums.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-slate-400">
                  <span>No custom albums yet</span>
                </div>
              ) : (
                albums.map((album) => {
                  const isSelected =
                    currentView.type === 'album_detail' && currentView.albumId === album.id;
                  return (
                    <motion.button
                      key={album.id}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectView({
                          type: 'album_detail',
                          albumId: album.id,
                          albumName: album.name,
                        });
                        onCloseMobile();
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-[#E5EBF2] text-indigo-600 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconFolder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{album.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                        {album.items_count}
                      </span>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Media Format Filters */}
          <div className="flex flex-col gap-1.5 p-2 rounded-[1.8rem] bg-[#EEF2F7] shadow-[6px_6px_14px_#cbd5e1,-6px_-6px_14px_#ffffff] border border-white/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono px-2 pt-1">
              Categories
            </span>

            <button
              onClick={() => {
                onSelectView({ type: 'type_filter', kind: 'photo' });
                onCloseMobile();
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView.type === 'type_filter' && currentView.kind === 'photo'
                  ? 'bg-[#E5EBF2] text-indigo-600 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IconPhoto className="w-3.5 h-3.5 text-indigo-400" />
              <span>Photos & Images</span>
            </button>

            <button
              onClick={() => {
                onSelectView({ type: 'type_filter', kind: 'video' });
                onCloseMobile();
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView.type === 'type_filter' && currentView.kind === 'video'
                  ? 'bg-[#E5EBF2] text-indigo-600 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IconVideoCamera className="w-3.5 h-3.5 text-indigo-400" />
              <span>Videos & Reels</span>
            </button>

            <button
              onClick={() => {
                onSelectView({ type: 'type_filter', kind: 'threads' });
                onCloseMobile();
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView.type === 'type_filter' && currentView.kind === 'threads'
                  ? 'bg-[#E5EBF2] text-indigo-600 shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IconThreads className="w-3.5 h-3.5 text-slate-700" />
              <span>Threads & Notes</span>
            </button>
          </div>

        </div>

        {/* Bottom Sidebar Info */}
        <div className="pt-4 border-t border-slate-200/80 px-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Local Vault Gallery</span>
          <span>v2.0</span>
        </div>
      </aside>
    </>
  );
}
