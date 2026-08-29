'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
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
   IconVidara,

} from '@/components/ui/Icons';

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
  const reducedMotion = useReducedMotion();

  const fetchAdapters = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/adapters');
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


  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <IconInstagram className="w-5 h-5 text-pink-400" />;
      case 'threads':
        return <IconThreads className="w-5 h-5 text-slate-200" />;
      case 'x':
        return <IconX className="w-5 h-5 text-slate-200" />;
      case 'tiktok':
        return <IconTikTok className="w-5 h-5 text-slate-200" />;
      case 'youtube':
        return <IconYouTube className="w-5 h-5 text-red-400" />;
      case 'reddit':
        return <IconReddit className="w-5 h-5 text-orange-400" />;
       case 'pinterest':
         return <IconPinterest className="w-5 h-5 text-red-400" />;
       case 'vidara':
         return <IconVidara className="w-5 h-5 text-emerald-400" />;

      default:
        return <IconShieldCheck className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reducedMotion ? { duration: 0.01 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="Close adapter drawer" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Platform adapters"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={reducedMotion ? { duration: 0.01 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/[0.08] bg-slate-950/95 p-6 shadow-2xl backdrop-blur-2xl">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-white/10">
                <IconShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Platform Adapters
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Engine &amp; Ingestion Health Check
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Adapters List */}
          <div className="flex flex-col gap-2.5">
            {loading && adapters.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400">
                Checking adapter engines...
              </div>
            ) : (
              adapters.map((ad) => (
                <div
                  key={ad.platform}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-950 border border-white/[0.06]">
                      {getPlatformIcon(ad.platform)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white capitalize">
                        {ad.platform}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Engine: {ad.engine}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono ${
                        ad.health_ok
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ad.health_ok ? 'bg-emerald-400' : 'bg-rose-400'
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
        <div className="pt-4 border-t border-white/[0.08]">
          <button
            onClick={fetchAdapters}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-white/10"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Testing Adapters...' : 'Re-test All Adapters'}</span>
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
