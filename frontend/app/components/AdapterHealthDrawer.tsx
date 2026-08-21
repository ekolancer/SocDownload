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
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <IconInstagram className="w-5 h-5 text-pink-600" />;
      case 'threads':
        return <IconThreads className="w-5 h-5 text-slate-800" />;
      case 'x':
        return <IconX className="w-5 h-5 text-slate-800" />;
      case 'tiktok':
        return <IconTikTok className="w-5 h-5 text-teal-600" />;
      case 'youtube':
        return <IconYouTube className="w-5 h-5 text-red-600" />;
      case 'reddit':
        return <IconReddit className="w-5 h-5 text-orange-600" />;
      case 'pinterest':
        return <IconPinterest className="w-5 h-5 text-red-600" />;
      default:
        return <IconShieldCheck className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-sm animate-spring-pop">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md h-full bg-[#EEF2F7] shadow-[-14px_0_30px_rgba(0,0,0,0.15)] border-l border-white/80 p-6 flex flex-col justify-between overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff]">
                <IconShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Platform Adapters
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Engine & Ingestion Health Check
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#EEF2F7] shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff] text-slate-500 hover:text-slate-900 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Adapters List */}
          <div className="flex flex-col gap-3">
            {loading && adapters.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400">
                Checking adapter engines...
              </div>
            ) : (
              adapters.map((ad) => (
                <div
                  key={ad.platform}
                  className="p-4 rounded-2xl bg-[#F4F7FB] border border-white/90 shadow-[3px_3px_8px_#d5dde9,-3px_-3px_8px_#ffffff] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#EEF2F7] shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]">
                      {getPlatformIcon(ad.platform)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-slate-800 capitalize">
                        {ad.platform}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Engine: {ad.engine}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold shadow-[inset_1px_1px_2px_#cbd5e1,inset_-1px_-1px_2px_#ffffff] ${
                        ad.health_ok
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ad.health_ok ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {ad.health_ok ? 'HEALTHY' : 'DEGRADED'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={fetchAdapters}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Testing Adapters...' : 'Re-test All Adapters'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
