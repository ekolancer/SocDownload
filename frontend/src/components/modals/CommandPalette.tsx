'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconLayers,
  IconActivity,
  IconSettings,
  IconUpload,
  IconVideoCamera,
  IconClose,
  IconCheck,
} from '@/components/ui/Icons';
import { useLayoutStore } from '@/lib/useLayoutStore';

interface CommandItem {
  id: string;
  category: 'NAVIGATION' | 'ACTIONS';
  title: string;
  description?: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, closeCommandPalette, openAdaptersDrawer } = useLayoutStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const baseItems: CommandItem[] = useMemo(() => [
    {
      id: 'nav-studio',
      category: 'NAVIGATION',
      title: 'Studio Dashboard',
      description: 'Main downloader & ingestion studio',
      shortcut: '⌘1',
      icon: IconLayers,
      onSelect: () => {
        closeCommandPalette();
        router.push('/');
      },
    },
    {
      id: 'nav-vault',
      category: 'NAVIGATION',
      title: 'Media Vault',
      description: 'Archived photos, videos, and albums',
      shortcut: '⌘2',
      icon: IconVideoCamera,
      onSelect: () => {
        closeCommandPalette();
        router.push('/vault');
      },
    },
    {
      id: 'nav-console',
      category: 'NAVIGATION',
      title: 'Operations Console',
      description: 'Live structured telemetry & diagnostics',
      shortcut: '⌘3',
      icon: IconActivity,
      onSelect: () => {
        closeCommandPalette();
        router.push('/console');
      },
    },
    {
      id: 'nav-settings',
      category: 'NAVIGATION',
      title: 'Settings & Credentials',
      description: 'Instagram credentials, engines & system preferences',
      shortcut: '⌘4',
      icon: IconSettings,
      onSelect: () => {
        closeCommandPalette();
        router.push('/settings');
      },
    },
    {
      id: 'action-adapters',
      category: 'ACTIONS',
      title: 'System Adapters & Engine Status',
      description: 'Inspect platform adapters (Instaloader, yt-dlp, Gallery-dl)',
      icon: IconActivity,
      onSelect: () => {
        closeCommandPalette();
        openAdaptersDrawer();
      },
    },
    {
      id: 'action-vault-search',
      category: 'ACTIONS',
      title: query ? `Search Vault for "${query}"` : 'Open Vault Search',
      description: 'Filter archived media by tags or title',
      icon: IconSearch,
      onSelect: () => {
        closeCommandPalette();
        if (query.trim()) {
          router.push(`/vault?q=${encodeURIComponent(query.trim())}`);
        } else {
          router.push('/vault');
        }
      },
    },
  ], [closeCommandPalette, openAdaptersDrawer, query, router]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return baseItems;
    const q = query.toLowerCase();
    return baseItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [baseItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, closeCommandPalette, filteredItems, selectedIndex]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCommandPalette}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#080d14]/95 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
              <IconSearch className="h-5 w-5 text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="w-full bg-transparent text-sm font-medium text-white placeholder:text-slate-500 outline-none"
              />
              <button
                type="button"
                onClick={closeCommandPalette}
                className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors"
                aria-label="Close command palette"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            {/* List Results */}
            <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No matching commands found for <span className="text-white">"{query}"</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border border-cyan-400/30 text-white shadow-[0_0_20px_-4px_rgba(34,211,238,0.25)]'
                            : 'border border-transparent text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                              isSelected
                                ? 'border-cyan-400/40 bg-cyan-400/20 text-cyan-300'
                                : 'border-white/10 bg-white/[0.03] text-slate-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.title}</p>
                            {item.description && (
                              <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                            )}
                          </div>
                        </div>

                        {item.shortcut && (
                          <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Hints */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-black/30 px-4 py-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-slate-300">↑</kbd>
                  <kbd className="ml-1 rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-slate-300">↓</kbd> navigate
                </span>
                <span>
                  <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-slate-300">↵</kbd> select
                </span>
                <span>
                  <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-slate-300">esc</kbd> close
                </span>
              </div>
              <span className="font-mono text-[9px] text-cyan-400/80">MediaVault Quick Command</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
