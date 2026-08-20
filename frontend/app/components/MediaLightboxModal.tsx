'use client';

import React, { useState, useEffect } from 'react';
import {
  IconClose,
  IconDownload,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconImage,
  IconPlay,
  IconLayers,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
  IconFacebook,
} from './Icons';

export interface MediaFile {
  id: number;
  kind: 'image' | 'video';
  url: string;
  name: string;
}

export interface MediaItem {
  id: number;
  platform: string;
  source_url: string;
  username: string | null;
  caption: string | null;
  posted_at: string | null;
  created_at: string | null;
  files: MediaFile[];
}

interface MediaLightboxModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export function MediaLightboxModal({ item, onClose }: MediaLightboxModalProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Reset file index when opening a new item
  useEffect(() => {
    setActiveFileIndex(0);
    setCopiedLink(false);
    setShowRawJson(false);
  }, [item?.id]);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && item && activeFileIndex < item.files.length - 1) {
        setActiveFileIndex((prev) => prev + 1);
      }
      if (e.key === 'ArrowLeft' && activeFileIndex > 0) {
        setActiveFileIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, item, activeFileIndex]);

  if (!item) return null;

  const currentFile = item.files[activeFileIndex] || item.files[0];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(item.source_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

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
    return <IconImage className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div
        className="relative w-full max-w-6xl max-h-[90vh] flex flex-col lg:flex-row rounded-2xl glass-panel-elevated border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Media Preview Canvas */}
        <div className="relative flex-1 bg-[#05060A] flex items-center justify-center min-h-[340px] lg:min-h-[560px] overflow-hidden group">
          {currentFile ? (
            currentFile.kind === 'video' ? (
              <video
                src={currentFile.url}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-lg"
              />
            ) : (
              <img
                src={currentFile.url}
                alt={item.caption || 'Media detail'}
                className="max-h-[75vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-lg transition-transform duration-300"
              />
            )
          ) : (
            <div className="text-slate-500 text-sm font-medium">No media preview available</div>
          )}

          {/* Multi-file Carousel Navigation (if more than 1 file) */}
          {item.files.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 z-10">
              {item.files.map((file, idx) => (
                <button
                  key={file.id}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                    activeFileIndex === idx
                      ? 'bg-indigo-600 text-white shadow-md scale-110'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                  title={`File ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Metadata & Action Inspector */}
        <div className="w-full lg:w-[380px] p-6 flex flex-col justify-between bg-[#0E101A] border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto max-h-[85vh]">
          <div className="flex flex-col gap-5">
            {/* Top Bar: Platform & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  {getPlatformIcon(item.platform)}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    {item.platform}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {item.username ? `@${item.username}` : 'Anonymous post'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Caption */}
            {item.caption && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Caption / Text
                </span>
                <p className="text-sm text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-1 bg-black/20 p-3 rounded-lg border border-white/5">
                  {item.caption}
                </p>
              </div>
            )}

            {/* Timestamps & Info Grid */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Posted At</span>
                <span className="text-slate-200 font-medium font-mono text-[11px]">
                  {item.posted_at ? new Date(item.posted_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Ingested</span>
                <span className="text-slate-200 font-medium font-mono text-[11px]">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Files</span>
                <span className="text-slate-200 font-medium font-mono text-[11px]">
                  {item.files.length} {item.files.length === 1 ? 'asset' : 'assets'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Active Format</span>
                <span className="text-slate-200 font-medium font-mono text-[11px] uppercase">
                  {currentFile?.kind || 'unknown'}
                </span>
              </div>
            </div>

            {/* Raw JSON inspection toggle */}
            <div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono underline cursor-pointer"
              >
                {showRawJson ? 'Hide Raw Metadata' : 'View Raw Metadata (JSON)'}
              </button>
              {showRawJson && (
                <pre className="mt-2 p-3 bg-black/60 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36 border border-white/10">
                  {JSON.stringify(item, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Action Buttons at bottom */}
          <div className="flex flex-col gap-2 pt-4 border-t border-white/10 mt-4">
            {currentFile && (
              <a
                href={currentFile.url}
                download={currentFile.name}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold gradient-btn-primary"
              >
                <IconDownload className="w-4 h-4" />
                <span>Save File ({currentFile.name})</span>
              </a>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-[#161928] hover:bg-[#1F2338] hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Post Link</span>
                  </>
                )}
              </button>

              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-[#161928] hover:bg-[#1F2338] hover:text-white border border-white/10 transition-colors"
                title="Open original post on platform"
              >
                <IconExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
