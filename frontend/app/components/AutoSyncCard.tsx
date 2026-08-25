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
          setSyncFeedback(`Successfully synced ${result.enqueued_count || 0} new item(s)`);
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
      <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 animate-pulse min-h-[160px] border border-white/40 shadow-sm" />
    );
  }

  const isEnabled = config?.enabled ?? false;
  const isSessionExpired = config?.session_expired || config?.last_sync_status === 'session_expired';

  // Format GMT+7 time
  const formattedLastSync = config?.last_sync_at
    ? new Date(
        config.last_sync_at.includes('Z') || config.last_sync_at.includes('+')
          ? config.last_sync_at
          : `${config.last_sync_at}Z`
      ).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).replace('.', ':') + ' WIB'
    : 'Never';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Session Expired Banner Warning (Glassmorphism Alert) */}
      {isSessionExpired && (
        <div className="w-full glass-panel rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-900 shadow-sm backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0">
              <IconAlertCircle className="w-5 h-5 text-white" />
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
              className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all duration-300 shadow-xs hover:shadow-md hover:shadow-rose-600/20 active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <span>Update Cookie</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform duration-300">
                ↗
              </div>
            </button>
          )}
        </div>
      )}

      {/* Main Auto-Sync Card (Signature Glass Panel) */}
      <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm border border-white/40 transition-all duration-300">
        
        {/* Header Section: Brand Emblem, Title, Status Pill & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-white/40">
          
          {/* Left: Brand Identity Block */}
          <div className="flex items-center gap-4">
            {/* Instagram Gradient Glass Emblem */}
            <div className="relative group shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-0.5 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                <div className="w-full h-full rounded-[0.875rem] bg-black/10 backdrop-blur-xs flex items-center justify-center">
                  <IconInstagram className="w-6 h-6 text-white drop-shadow-xs" />
                </div>
              </div>
            </div>

            {/* Title & Live Status Beacon */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Instagram Auto-Sync Automation
                </h3>

                {/* Glassmorphism Status Capsule */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all duration-300 ${
                    isSessionExpired
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : isEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-white/60 text-slate-600 border border-white/50'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {isEnabled && !isSessionExpired && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
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

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Headless background daemon continuously archives your mobile saved & liked posts without opening browser.
              </p>
            </div>
          </div>

          {/* Right: Sync Action & Master Switch */}
          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            
            {/* Glass Sync Now Button */}
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncingNow || isUpdating}
              className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-panel hover:bg-white/80 text-slate-800 text-xs font-bold shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/50"
              title="Force immediate collection poll"
            >
              <IconRefresh className={`w-3.5 h-3.5 text-indigo-600 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* iOS/Stitch Style Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onClick={() => updateConfig({ enabled: !isEnabled })}
              disabled={isUpdating}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-slate-900 shadow-inner' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>

          </div>

        </div>

        {/* Body: 3-Column Glass Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Interval Selector */}
          <div className="flex flex-col justify-between gap-2.5 p-4 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <IconClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Polling Interval</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/50">
                Every {config?.interval_minutes || 15}m
              </span>
            </div>

            {/* Interval Segmented Dock */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/50 border border-white/60">
              {INTERVAL_OPTIONS.map((min) => {
                const isSelected = config?.interval_minutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => updateConfig({ interval_minutes: min })}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'glass-panel hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    {min}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Collection Scope (Interactive Tactile Tiles) */}
          <div className="flex flex-col justify-between gap-2.5 p-4 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <IconZap className="w-3.5 h-3.5 text-pink-600" />
                <span>Target Collections</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Tap to toggle
              </span>
            </div>

            {/* Tactile Tiles */}
            <div className="grid grid-cols-2 gap-2">
              {/* Saved Posts Tile */}
              <button
                type="button"
                onClick={() => updateConfig({ sync_saved: !(config?.sync_saved ?? true) })}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left ${
                  (config?.sync_saved ?? true)
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-950 font-bold shadow-2xs'
                    : 'bg-white/30 hover:bg-white/60 border-white/50 text-slate-600 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      (config?.sync_saved ?? true)
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <IconBookmark className="w-3 h-3" />
                  </div>
                  <span className="text-xs">Saved</span>
                </div>
                {(config?.sync_saved ?? true) && (
                  <span className="text-[10px] font-bold text-indigo-600">✓</span>
                )}
              </button>

              {/* Liked Posts Tile */}
              <button
                type="button"
                onClick={() => updateConfig({ sync_liked: !config?.sync_liked })}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left ${
                  config?.sync_liked
                    ? 'bg-pink-500/10 border-pink-500/30 text-pink-950 font-bold shadow-2xs'
                    : 'bg-white/30 hover:bg-white/60 border-white/50 text-slate-600 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      config?.sync_liked
                        ? 'bg-pink-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <IconHeart className="w-3 h-3" />
                  </div>
                  <span className="text-xs">Liked</span>
                </div>
                {config?.sync_liked && (
                  <span className="text-[10px] font-bold text-pink-600">✓</span>
                )}
              </button>
            </div>
          </div>

          {/* 3. Sync Activity & Metrics */}
          <div className="flex flex-col justify-between gap-2.5 p-4 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Sync Activity
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>GMT+7</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium">Last Synced</span>
                <span className="text-slate-800 font-bold text-[11px]">
                  {formattedLastSync}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50/80 text-indigo-700 font-bold border border-indigo-100/50">
                {config?.items_synced_total || 0} items
              </span>
            </div>
          </div>

        </div>

        {/* Sync Feedback Toast Message */}
        {syncFeedback && (
          <div className="w-full text-xs font-mono font-bold text-indigo-800 px-3.5 py-2 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center gap-2 animate-fade-in">
            <IconSparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

      </div>
    </div>
  );
}
