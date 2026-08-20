'use client';

import React, { useEffect, useState } from 'react';
import {
  IconClose,
  IconShieldCheck,
  IconAlertCircle,
  IconRefresh,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
  IconFacebook,
} from './Icons';

interface AdapterInfo {
  platform: string;
  adapter_name: string;
  engine: string;
  health_ok: boolean;
  last_health_at: string | null;
}

interface AdapterHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdapterHealthDrawer({ isOpen, onClose }: AdapterHealthDrawerProps) {
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAdapters = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/adapters');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setAdapters(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load adapters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdapters();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <IconInstagram className="w-4 h-4 text-rose-400" />;
    if (p.includes('threads')) return <IconThreads className="w-4 h-4 text-slate-200" />;
    if (p.includes('x') || p.includes('twitter')) return <IconX className="w-4 h-4 text-sky-400" />;
    if (p.includes('tiktok')) return <IconTikTok className="w-4 h-4 text-teal-300" />;
    if (p.includes('youtube')) return <IconYouTube className="w-4 h-4 text-red-400" />;
    if (p.includes('reddit')) return <IconReddit className="w-4 h-4 text-orange-400" />;
    if (p.includes('pinterest')) return <IconPinterest className="w-4 h-4 text-rose-500" />;
    if (p.includes('facebook')) return <IconFacebook className="w-4 h-4 text-blue-400" />;
    return <IconShieldCheck className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl glass-panel-elevated border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#12141F]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <IconShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Platform Adapters & Extraction Engines
              </h3>
              <p className="text-xs text-slate-400">
                Health verification for all 8 supported social media adapters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdapters}
              disabled={loading}
              className="p-2 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh status"
            >
              <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-3">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {loading && adapters.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs font-mono">
              Checking adapter health...
            </div>
          )}

          {adapters.map((adapter) => (
            <div
              key={adapter.platform}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#12141F] border border-white/[0.08] hover:border-white/15 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  {getPlatformIcon(adapter.platform)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-200 capitalize">
                      {adapter.platform}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10">
                      {adapter.engine}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {adapter.adapter_name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {adapter.health_ok ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Operational</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <IconAlertCircle className="w-3 h-3 text-amber-400" />
                    <span>Check Required</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 bg-[#0C0E17] text-xs text-slate-400 flex items-center justify-between">
          <span>Engines: yt-dlp • gallery-dl • instaloader</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
