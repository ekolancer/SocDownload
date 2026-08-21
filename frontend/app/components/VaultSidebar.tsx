'use client';

import React from 'react';
import {
  IconPhoto,
  IconStarFilled,
  IconFolder,
  IconFolderPlus,
  IconUsers,
  IconVideoCamera,
  IconThreads,
  IconClose,
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

  const sidebarContent = (
    <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 no-scrollbar">
      
      {/* Main Views Navigation Group */}
      <div className="flex flex-col gap-1 p-2 rounded-2xl bg-white border border-slate-200 m3-elevation-1">
        
        {/* 1. Photos & Timeline */}
        <button
          type="button"
          onClick={() => {
            onSelectView({ type: 'timeline' });
            onCloseMobile();
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            isTimelineActive
              ? 'bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <IconPhoto className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Timeline</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 font-bold">
            {totalMediaCount}
          </span>
        </button>

        {/* 2. Favorites */}
        <button
          type="button"
          onClick={() => {
            onSelectView({ type: 'favorites' });
            onCloseMobile();
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            isFavoritesActive
              ? 'bg-amber-50 text-amber-950 font-extrabold border border-amber-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <IconStarFilled className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Favorites ⭐</span>
          </div>
          {favoritesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-900 font-extrabold">
              {favoritesCount}
            </span>
          )}
        </button>

        {/* 3. Creators Hub */}
        <button
          type="button"
          onClick={() => {
            onSelectView({ type: 'creators_list' });
            onCloseMobile();
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            isCreatorsActive
              ? 'bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <IconUsers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Creators Hub</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 font-bold">
            {creators.length}
          </span>
        </button>
      </div>

      {/* Albums Section */}
      <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white border border-slate-200 m3-elevation-1">
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            My Albums ({albums.length})
          </span>
          <button
            type="button"
            onClick={onOpenCreateAlbum}
            className="p-1 rounded-full text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-all cursor-pointer"
            title="Create New Album"
          >
            <IconFolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
          {albums.length === 0 ? (
            <div className="px-2 py-2.5 text-center text-xs text-slate-400">
              <span>No custom albums yet</span>
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
                    onCloseMobile();
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconFolder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{album.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                    {album.items_count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Categories Section */}
      <div className="flex flex-col gap-1 p-2 rounded-2xl bg-white border border-slate-200 m3-elevation-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono px-2 pt-1">
          Categories
        </span>

        <button
          type="button"
          onClick={() => {
            onSelectView({ type: 'type_filter', kind: 'photo' });
            onCloseMobile();
          }}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            currentView.type === 'type_filter' && currentView.kind === 'photo'
              ? 'bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <IconPhoto className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Photos & Images</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectView({ type: 'type_filter', kind: 'video' });
            onCloseMobile();
          }}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            currentView.type === 'type_filter' && currentView.kind === 'video'
              ? 'bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <IconVideoCamera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Videos & Reels</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectView({ type: 'type_filter', kind: 'threads' });
            onCloseMobile();
          }}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            currentView.type === 'type_filter' && currentView.kind === 'threads'
              ? 'bg-indigo-50 text-indigo-900 font-extrabold border border-indigo-200'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <IconThreads className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          <span>Threads & Notes</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar (Always visible on lg screens) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-20 h-[calc(100vh-6rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Visible when isOpenMobile is true) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-slate-50 border-r border-slate-200 p-4 flex flex-col justify-between z-10 m3-elevation-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-extrabold text-sm text-slate-900">MediaVault Menu</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 mt-4">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
