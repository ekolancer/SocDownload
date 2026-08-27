'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import {
  IconInstagram,
  IconRefresh,
  IconClock,
  IconCheckCircle,
  IconAlertCircle,
  IconSparkles,
} from '@/components/ui/Icons';

interface AutoSyncConfig {
  platform: string;
  enabled: boolean;
  sync_saved: boolean;
  interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  items_synced_total: number;
  last_discovered_count?: number;
  last_enqueued_count?: number;
  last_skipped_count?: number;
  last_failed_count?: number;
  session_expired?: boolean;
}

interface AutoSyncCardProps {
  onOpenAdapters?: () => void;
  onSyncComplete?: () => void;
}

const INTERVAL_OPTIONS = [5, 15, 30, 60];

export function AutoSyncCard({ onOpenAdapters, onSyncComplete }: AutoSyncCardProps) {
  const [config, setConfig] = useState<AutoSyncConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Fetch initial config
  const fetchConfig = async () => {
    try {
      const res = await apiFetch('/api/autosync/config?platform=instagram');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load autosync config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Update config
  const updateConfig = async (patch: Partial<AutoSyncConfig>) => {
    if (!config) return;
    try {
      const res = await apiFetch('/api/autosync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          ...patch,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to update autosync config:', err);
    }
  };

  // Trigger manual sync now
  const handleTriggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await apiFetch('/api/autosync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'instagram' }),
      });

      const data = await res.json();

      if (res.ok && data.sync_result) {
        const r = data.sync_result;
        if (r.status === 'ok') {
          setSyncFeedback(
            `✓ Sync selesai: +${r.enqueued_count} terdownload, ${r.skipped_dup_count || 0} duplikat di-skip`
          );
        } else if (r.status === 'session_expired') {
          setSyncFeedback('Session expired. Silakan update cookie Instagram di panel adapters.');
        } else {
          setSyncFeedback(`Info: ${r.status}`);
        }
        if (data.config) {
          setConfig(data.config);
        }
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncFeedback('Gagal memulai sinkronisasi.');
      }
    } catch (err) {
      console.error('Failed to trigger autosync:', err);
      setSyncFeedback('Koneksi terputus saat memicu sinkronisasi.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-900/60 rounded-2xl p-4 sm:p-5 animate-pulse min-h-[110px] border border-white/[0.08] shadow-sm" />
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
        <div className="w-full rounded-xl bg-rose-950/60 border border-rose-500/30 p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-200 shadow-sm backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <IconAlertCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-white">
                Session Expired, Please Re-login
              </span>
              <span className="text-[11px] text-rose-300 font-medium">
                Sesi cookie Instagram telah kedaluwarsa. Perbarui cookie di panel Adapters untuk melanjutkan auto-sync.
              </span>
            </div>
          </div>
          {onOpenAdapters && (
            <button
              type="button"
              onClick={onOpenAdapters}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Update Cookie →
            </button>
          )}
        </div>
      )}

      {/* Main Compact High-End Glassmorphic Card */}
      <div className="w-full bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] border border-white/[0.08]">
        
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          
          {/* Platform Identity & Status */}
          <div className="flex items-center gap-2.5">
            {/* Instagram Gradient Refraction Badge */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0 border border-white/20">
              <IconInstagram className="w-4.5 h-4.5 text-white" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
                  Instagram Saved Posts Sync
                </h3>
                {/* Concentric Status Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                    isEnabled
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-800/60 border-white/10 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{isEnabled ? 'Active' : 'Disabled'}</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                Otomatis mengunduh postingan tersimpan (Saved Posts) secara berkala
              </span>
            </div>
          </div>

          {/* Quick Actions & Master Switch */}
          <div className="flex items-center gap-2">
            {/* Sync Now Trigger */}
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={syncing || !isEnabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 hover:border-white/20 shadow-2xs hover:shadow-xs active:scale-95 text-slate-200 hover:text-white font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Jalankan sinkronisasi sekarang"
              title="Jalankan sinkronisasi sekarang"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Master Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onClick={() => updateConfig({ enabled: !isEnabled, sync_saved: true })}
              className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-800'
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

        {/* Body: 2-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* 1. Interval Selector (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-2 p-3 rounded-xl bg-slate-950/50 border border-white/[0.06] backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <IconClock className="w-3 h-3 text-emerald-400" />
                <span>Interval Pengecekan</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                Setiap {config?.interval_minutes || 15} Menit
              </span>
            </div>

            {/* Interval Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              {INTERVAL_OPTIONS.map((min) => {
                const isSelected = config?.interval_minutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => updateConfig({ interval_minutes: min })}
                    className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-slate-950 shadow-2xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {min}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Detailed Sync Outcome Breakdown (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-1.5 p-3 rounded-xl bg-slate-950/50 border border-white/[0.06] backdrop-blur-md shadow-2xs">
            {/* Header: Last sync & timezone */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider">
                  Hasil Sync Terakhir
                </span>
                <span className="font-mono font-bold text-slate-300 bg-slate-900/80 px-1.5 py-0.2 rounded border border-white/10 shadow-2xs">
                  {formattedLastSync}
                </span>
              </div>
              <span className="flex items-center gap-1 font-mono font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>WIB</span>
              </span>
            </div>

            {/* 4 Outcome Metrics: Terbaca, Sukses, Di-skip, Gagal */}
            <div className="grid grid-cols-4 gap-1.5">
              
              {/* 1. Terbaca (Total Scanned/Discovered) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/80 border border-white/[0.08] text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-slate-400">
                  Terbaca
                </span>
                <span className="text-xs font-bold font-mono text-white mt-0.5">
                  {config?.last_discovered_count || 0}
                </span>
              </div>

              {/* 2. Sukses (Downloaded / Enqueued) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-emerald-400">
                  Sukses
                </span>
                <span className="text-xs font-bold font-mono text-emerald-300 mt-0.5">
                  +{config?.last_enqueued_count || 0}
                </span>
              </div>

              {/* 3. Di-skip (Duplicate / Already in Vault) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-amber-400">
                  Di-skip
                </span>
                <span className="text-xs font-bold font-mono text-amber-300 mt-0.5">
                  {config?.last_skipped_count || 0}
                </span>
              </div>

              {/* 4. Gagal (Failed / Error) */}
              <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-center shadow-2xs">
                <span className="text-[8.5px] font-mono uppercase font-bold text-rose-400">
                  Gagal
                </span>
                <span className="text-xs font-bold font-mono text-rose-300 mt-0.5">
                  {config?.last_failed_count || 0}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Sync Feedback Toast Message */}
        {syncFeedback && (
          <div className="w-full text-xs font-mono font-semibold text-emerald-300 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-2 animate-fade-in shadow-2xs backdrop-blur-md">
            <IconSparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

      </div>
    </div>
  );
}
