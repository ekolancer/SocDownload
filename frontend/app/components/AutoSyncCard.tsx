'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  IconInstagram,
  IconRefresh,
  IconSparkles,
  IconBookmark,
  IconHeart,
  IconClock,
  IconZap,
  IconAlertCircle,
} from './Icons';

export interface AutoSyncConfigData {
  platform: string;
  enabled: boolean;
  sync_saved: boolean;
  sync_liked: boolean;
  interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  items_synced_total: number;
  last_discovered_count?: number;
  last_enqueued_count?: number;
  last_skipped_count?: number;
  last_failed_count?: number;
  session_expired: boolean;
}

interface AutoSyncCardProps {
  onOpenAdapters?: () => void;
  onSyncComplete?: () => void;
}

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60];

export function AutoSyncCard({ onOpenAdapters, onSyncComplete }: AutoSyncCardProps) {
  const [config, setConfig] = useState<AutoSyncConfigData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/autosync/config?platform=instagram');
      if (res.ok) {
        const data: AutoSyncConfigData = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error('Failed to fetch autosync config', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  const updateConfig = async (patch: Partial<AutoSyncConfigData>) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/autosync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          ...patch,
        }),
      });
      if (res.ok) {
        const data: AutoSyncConfigData = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error('Failed to update autosync config', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncingNow(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/autosync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'instagram' }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        const result = data.sync_result;
        if (result.status === 'ok') {
          const discovered = result.fetched_total || 0;
          const enqueued = result.enqueued_count || 0;
          const skipped = result.skipped_dup_count || 0;
          const failed = result.failed_count || 0;
          setSyncFeedback(
            `Sync selesai: ${discovered} terbaca (${enqueued} sukses download, ${skipped} di-skip, ${failed} gagal)`
          );
          if (onSyncComplete) onSyncComplete();
        } else if (result.status === 'session_expired') {
          setSyncFeedback('Session expired. Please update cookie.');
        } else {
          setSyncFeedback(result.error || 'Sync completed');
        }
      }
    } catch (e) {
      setSyncFeedback('Sync trigger failed');
    } finally {
      setIsSyncingNow(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  if (loading && !config) {
    return (
      <div className="w-full glass-panel rounded-2xl p-4 sm:p-5 animate-pulse min-h-[120px] border border-white/40 shadow-sm" />
    );
  }

  const isEnabled = config?.enabled ?? false;
  const isSessionExpired = config?.session_expired || config?.last_sync_status === 'session_expired';

  // Format GMT+7 time
  const formattedLastSync = (() => {
    if (!config?.last_sync_at) return 'Belum pernah';
    let str = config.last_sync_at;
    if (!str.includes('Z') && !str.includes('+') && !/\d{2}-\d{2}$/.test(str)) {
      str = str + '+07:00';
    }
    const d = new Date(str);
    const validDate = isNaN(d.getTime()) ? new Date(config.last_sync_at) : d;
    return (
      validDate
        .toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
        .replace(/\./g, ':') + ' WIB'
    );
  })();


  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Session Expired Banner Warning */}
      {isSessionExpired && (
        <div className="w-full glass-panel rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 shadow-sm backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <IconAlertCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-rose-950 tracking-tight">
                Session expired, please re-login and update cookie.
              </span>
              <span className="text-[11px] text-rose-700 font-medium">
                Instagram authentication cookie has expired. Automatic polling is currently suspended.
              </span>
            </div>
          </div>
          {onOpenAdapters && (
            <button
              type="button"
              onClick={onOpenAdapters}
              className="group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all duration-200 shadow-xs hover:shadow-sm active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <span>Update Cookie</span>
              <span className="text-[10px] group-hover:translate-x-0.5 transition-transform duration-200">↗</span>
            </button>
          )}
        </div>
      )}

      {/* Main Auto-Sync Card (Compact Glass Panel) */}
      <div className="w-full glass-panel rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm border border-white/40 transition-all duration-300">
        
        {/* Header: Brand, Title, Status & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/40">
          
          {/* Left: Brand & Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-0.5 flex items-center justify-center text-white shadow-xs shrink-0">
              <div className="w-full h-full rounded-[0.55rem] bg-black/10 backdrop-blur-xs flex items-center justify-center">
                <IconInstagram className="w-4.5 h-4.5 text-white" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Instagram Auto-Sync
                </h3>

                {/* Compact Status Capsule */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider transition-all duration-300 ${
                    isSessionExpired
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : isEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-white/60 text-slate-600 border border-white/50'
                  }`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    {isEnabled && !isSessionExpired && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        isSessionExpired
                          ? 'bg-rose-500'
                          : isEnabled
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  </span>
                  <span>
                    {isSessionExpired
                      ? 'SESSION EXPIRED'
                      : isEnabled
                      ? 'ACTIVE POLLING'
                      : 'STANDBY'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                Headless background daemon auto-downloads mobile saved & liked posts without browser.
              </p>
            </div>
          </div>

          {/* Right: Sync Action & Switch */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {/* Compact Sync Now Button */}
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncingNow || isUpdating}
              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl glass-panel hover:bg-white/80 text-slate-800 text-xs font-bold shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/50"
              title="Force immediate collection poll"
            >
              <IconRefresh className={`w-3 h-3 text-indigo-600 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Compact iOS Style Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onClick={() => updateConfig({ enabled: !isEnabled })}
              disabled={isUpdating}
              className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-slate-900 shadow-inner' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

        </div>

        {/* Body: Compact Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* 1. Interval Selector (lg:col-span-3) */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-1.5 p-3 rounded-xl bg-white/40 border border-white/50 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <IconClock className="w-3 h-3 text-indigo-600" />
                <span>Interval</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100/50">
                {config?.interval_minutes || 15}m
              </span>
            </div>

            {/* Interval Pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/50 border border-white/60">
              {INTERVAL_OPTIONS.map((min) => {
                const isSelected = config?.interval_minutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => updateConfig({ interval_minutes: min })}
                    className={`flex-1 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'glass-panel hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    {min}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Collection Scope (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-1.5 p-3 rounded-xl bg-white/40 border border-white/50 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <IconZap className="w-3 h-3 text-pink-600" />
                <span>Target Koleksi</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                Pilih filter
              </span>
            </div>

            {/* Compact Tactile Tiles */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Saved Posts */}
              <button
                type="button"
                onClick={() => updateConfig({ sync_saved: !(config?.sync_saved ?? true) })}
                className={`flex items-center justify-between p-1.5 px-2 rounded-lg border transition-all cursor-pointer text-left ${
                  (config?.sync_saved ?? true)
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-950 font-bold shadow-2xs'
                    : 'bg-white/30 hover:bg-white/60 border-white/50 text-slate-600 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <IconBookmark className={`w-3 h-3 ${(config?.sync_saved ?? true) ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="text-xs">Saved</span>
                </div>
                {(config?.sync_saved ?? true) && (
                  <span className="text-[9px] font-bold text-indigo-600">✓</span>
                )}
              </button>

              {/* Liked Posts */}
              <button
                type="button"
                onClick={() => updateConfig({ sync_liked: !config?.sync_liked })}
                className={`flex items-center justify-between p-1.5 px-2 rounded-lg border transition-all cursor-pointer text-left ${
                  config?.sync_liked
                    ? 'bg-pink-500/10 border-pink-500/30 text-pink-950 font-bold shadow-2xs'
                    : 'bg-white/30 hover:bg-white/60 border-white/50 text-slate-600 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <IconHeart className={`w-3 h-3 ${config?.sync_liked ? 'text-pink-600' : 'text-slate-400'}`} />
                  <span className="text-xs">Liked</span>
                </div>
                {config?.sync_liked && (
                  <span className="text-[9px] font-bold text-pink-600">✓</span>
                )}
              </button>
            </div>
          </div>

          {/* 3. Detailed Sync Outcome Breakdown (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-1.5 p-3 rounded-xl bg-white/40 border border-white/50 backdrop-blur-md shadow-2xs">
            {/* Header: Last sync & timezone */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Hasil Sync Terakhir
                </span>
                <span className="font-mono font-bold text-slate-700 bg-white/60 px-1.5 py-0.2 rounded border border-white/60 shadow-2xs">
                  {formattedLastSync}
                </span>
              </div>
              <span className="flex items-center gap-1 font-mono font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>WIB</span>
              </span>
            </div>

            {/* 4 Outcome Metrics: Terbaca, Sukses, Di-skip, Gagal */}
            <div className="grid grid-cols-4 gap-1.5">
              
              {/* 1. Terbaca (Total Scanned/Discovered) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/5 border border-slate-900/10 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-slate-600">
                  Terbaca
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 mt-0.5">
                  {config?.last_discovered_count || 0}
                </span>
              </div>

              {/* 2. Sukses (Downloaded / Enqueued) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-emerald-800">
                  Sukses
                </span>
                <span className="text-xs font-bold font-mono text-emerald-950 mt-0.5">
                  +{config?.last_enqueued_count || 0}
                </span>
              </div>

              {/* 3. Di-skip (Duplicate / Already in Vault) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-amber-800">
                  Di-skip
                </span>
                <span className="text-xs font-bold font-mono text-amber-950 mt-0.5">
                  {config?.last_skipped_count || 0}
                </span>
              </div>

              {/* 4. Gagal (Failed / Error) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-rose-800">
                  Gagal
                </span>
                <span className="text-xs font-bold font-mono text-rose-950 mt-0.5">
                  {config?.last_failed_count || 0}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Sync Feedback Toast Message */}
        {syncFeedback && (
          <div className="w-full text-xs font-mono font-semibold text-indigo-900 px-3 py-1.5 rounded-xl bg-indigo-50/90 border border-indigo-200 flex items-center gap-2 animate-fade-in shadow-2xs">
            <IconSparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

      </div>
    </div>
  );
}
