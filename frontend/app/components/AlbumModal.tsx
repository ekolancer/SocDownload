'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconFolder,
  IconFolderPlus,
  IconCheck,
  IconSparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-spring-pop">
      <div className="relative w-full max-w-md rounded-[2.2rem] bg-[#EEF2F7] shadow-[16px_16px_36px_rgba(0,0,0,0.25),-10px_-10px_30px_rgba(255,255,255,0.9)] border border-white/90 p-6 sm:p-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#EEF2F7] shadow-[4px_4px_10px_#cbd5e1,-4px_-4px_10px_#ffffff]">
              <IconFolderPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-snug">
                {mode === 'create_only' ? 'Create New Album' : 'Add to Album'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {selectedMediaIds.length > 0
                  ? `Assign ${selectedMediaIds.length} items to album`
                  : 'Organize your archived media'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher if in add_to_album mode */}
        {mode === 'add_to_album' && albums.length > 0 && (
          <div className="flex items-center p-1 rounded-xl bg-[#E5EBF2] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]">
            <button
              type="button"
              onClick={() => setActiveTab('existing')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'existing'
                  ? 'bg-[#EEF2F7] text-indigo-600 shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff]'
                  : 'text-slate-500'
              }`}
            >
              Choose Existing ({albums.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'new'
                  ? 'bg-[#EEF2F7] text-indigo-600 shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff]'
                  : 'text-slate-500'
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
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]'
                        : 'bg-[#EEF2F7] border-white/80 shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconFolder className="w-4 h-4 text-indigo-500" />
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
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider font-mono">
                  Album Name
                </label>
                <div className="rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] p-2.5">
                  <input
                    type="text"
                    required
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="e.g. Liburan Bali, Inspirasi Desain..."
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none px-2"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider font-mono">
                  Description (Optional)
                </label>
                <div className="rounded-2xl bg-[#E5EBF2] shadow-[inset_3px_3px_6px_#cbd5e1,inset_-3px_-3px_6px_#ffffff] p-2.5">
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of this album..."
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none px-2 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting || (activeTab === 'new' && !albumName.trim())}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 shadow-[3px_3px_10px_rgba(79,70,229,0.35),-2px_-2px_6px_#ffffff] hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : mode === 'create_only'
                ? 'Create Album'
                : 'Confirm & Add'}
            </motion.button>
          </div>
        </form>

      </div>
    </div>
  );
}
