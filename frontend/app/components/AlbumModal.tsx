'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconClose,
  IconFolder,
  IconFolderPlus,
  IconCheck,
} from './Icons';
import { AlbumSummary } from './VaultSidebar';

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create_only' | 'add_to_album';
  albums: AlbumSummary[];
  selectedMediaIds?: number[];
  onCreateAlbum: (name: string, description?: string) => Promise<number | null>;
  onAddItemsToAlbum?: (albumId: number, mediaIds: number[]) => Promise<boolean>;
}

export function AlbumModal({
  isOpen,
  onClose,
  mode,
  albums,
  selectedMediaIds = [],
  onCreateAlbum,
  onAddItemsToAlbum,
}: AlbumModalProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>(
    mode === 'create_only' || albums.length === 0 ? 'new' : 'existing'
  );
  const [albumName, setAlbumName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(
    albums.length > 0 ? albums[0].id : null
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (activeTab === 'new') {
        if (!albumName.trim()) return;
        const newAlbumId = await onCreateAlbum(albumName.trim(), description.trim() || undefined);
        if (newAlbumId && selectedMediaIds.length > 0 && onAddItemsToAlbum) {
          await onAddItemsToAlbum(newAlbumId, selectedMediaIds);
        }
      } else if (selectedAlbumId && selectedMediaIds.length > 0 && onAddItemsToAlbum) {
        await onAddItemsToAlbum(selectedAlbumId, selectedMediaIds);
      }
      setAlbumName('');
      setDescription('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[28px] bg-white m3-elevation-3 border border-slate-200/90 p-6 sm:p-7 flex flex-col gap-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <IconFolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                {mode === 'create_only' ? 'Create New Album' : 'Add to Album'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {selectedMediaIds.length > 0
                  ? `Assign ${selectedMediaIds.length} items to album`
                  : 'Organize your media collections'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        {mode === 'add_to_album' && albums.length > 0 && (
          <div className="flex items-center p-1 rounded-full bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('existing')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'existing'
                  ? 'bg-white text-indigo-950 m3-elevation-1 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Choose Existing ({albums.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'new'
                  ? 'bg-white text-indigo-950 m3-elevation-1 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Create New
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {activeTab === 'existing' && mode === 'add_to_album' ? (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
              {albums.map((album) => {
                const isSelected = selectedAlbumId === album.id;
                return (
                  <div
                    key={album.id}
                    onClick={() => setSelectedAlbumId(album.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 m3-elevation-1'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconFolder className="w-4 h-4 text-indigo-600" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{album.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {album.items_count} media items
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <IconCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono">
                  Album Name
                </label>
                <input
                  type="text"
                  required
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="e.g. Travel, Design Inspiration..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of this album..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (activeTab === 'new' && !albumName.trim())}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 m3-elevation-1 transition-all cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : mode === 'create_only'
                ? 'Create Album'
                : 'Confirm & Add'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
