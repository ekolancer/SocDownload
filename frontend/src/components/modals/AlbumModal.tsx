'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconFolder,
  IconFolderPlus,
  IconPencil,
  IconCheck,
} from '@/components/ui/Icons';
import { AlbumSummary } from '@/components/vault/VaultSidebar';

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create_only' | 'add_to_album' | 'edit';
  albums: AlbumSummary[];
  selectedMediaIds?: number[];
  initialData?: { id: number; name: string; description?: string } | null;
  onCreateAlbum: (name: string, description?: string) => Promise<number | null>;
  onUpdateAlbum?: (albumId: number, name: string, description?: string) => Promise<boolean>;
  onAddItemsToAlbum?: (albumId: number, mediaIds: number[]) => Promise<boolean>;
}

export function AlbumModal({
  isOpen,
  onClose,
  mode,
  albums,
  selectedMediaIds = [],
  initialData = null,
  onCreateAlbum,
  onUpdateAlbum,
  onAddItemsToAlbum,
}: AlbumModalProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('new');
  const [albumName, setAlbumName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setAlbumName(initialData.name || '');
        setDescription(initialData.description || '');
        setActiveTab('new');
      } else {
        setAlbumName('');
        setDescription('');
        setActiveTab(mode === 'create_only' || albums.length === 0 ? 'new' : 'existing');
        setSelectedAlbumId(albums.length > 0 ? albums[0].id : null);
      }
    }
  }, [isOpen, mode, initialData, albums]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (mode === 'edit') {
        if (!albumName.trim() || !initialData || !onUpdateAlbum) return;
        const success = await onUpdateAlbum(
          initialData.id,
          albumName.trim(),
          description.trim() || undefined
        );
        if (success) onClose();
      } else if (activeTab === 'new') {
        if (!albumName.trim()) return;
        const newAlbumId = await onCreateAlbum(albumName.trim(), description.trim() || undefined);
        if (newAlbumId && selectedMediaIds.length > 0 && onAddItemsToAlbum) {
          await onAddItemsToAlbum(newAlbumId, selectedMediaIds);
        }
        onClose();
      } else if (selectedAlbumId && selectedMediaIds.length > 0 && onAddItemsToAlbum) {
        await onAddItemsToAlbum(selectedAlbumId, selectedMediaIds);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/10 p-6 sm:p-7 flex flex-col gap-5 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs aspect-square">
                {mode === 'edit' ? (
                  <IconPencil className="w-5 h-5" />
                ) : (
                  <IconFolderPlus className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {mode === 'edit'
                    ? 'Edit Album'
                    : mode === 'create_only'
                    ? 'Create New Album'
                    : 'Add to Album'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {mode === 'edit'
                    ? 'Update album name and details'
                    : selectedMediaIds.length > 0
                    ? `Assign ${selectedMediaIds.length} items to album`
                    : 'Organize your media collections'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 aspect-square transition-all cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher (Only in Add to Album mode) */}
          {mode === 'add_to_album' && albums.length > 0 && (
            <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveTab('existing')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'existing'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Choose Existing ({albums.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'new'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-white shadow-xs'
                          : 'bg-slate-950/60 border-white/[0.08] text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconFolder className="w-4 h-4 text-emerald-400" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{album.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {album.items_count} media items
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 aspect-square font-bold">
                          <IconCheck className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="album-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Album Name
                  </label>
                  <input
                    id="album-name"
                    type="text"
                    required
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="e.g. Travel, Inspiration, Reels..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs sm:text-sm text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description about this album..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs sm:text-sm text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || (activeTab === 'new' && !albumName.trim())}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-white/10"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950/40 border-t-slate-950 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <IconCheck className="w-3.5 h-3.5" />
                    <span>
                      {mode === 'edit'
                        ? 'Save Changes'
                        : mode === 'create_only'
                        ? 'Create Album'
                        : activeTab === 'new'
                        ? 'Create & Add'
                        : 'Add to Album'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
