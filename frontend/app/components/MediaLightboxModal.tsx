'use client';

import React, { useState, useEffect } from 'react';
import {
  IconClose,
  IconDownload,
  IconExternalLink,
  IconLayers,
  IconCheckCircle,
  IconInstagram,
  IconThreads,
  IconX,
  IconTikTok,
  IconYouTube,
  IconReddit,
  IconPinterest,
} from './Icons';

export interface MediaFile {
  id: number;
  kind: 'image' | 'video';
  url: string;
  name: string;
  path?: string;
}

export interface MediaItem {
  id: number;
  platform: string;
  source_url: string;
  username: string | null;
  caption: string | null;
  posted_at: string | null;
  created_at: string | null;
  hashtags?: string | null;
  files: MediaFile[];
}

interface MediaLightboxModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export function MediaLightboxModal({ item, onClose }: MediaLightboxModalProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reset file index when opening a new item
  useEffect(() => {
    setActiveFileIndex(0);
    setCopiedLink(false);
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
  }, [item, activeFileIndex, onClose]);

  if (!item) return null;

  const currentFile = item.files?.[activeFileIndex];
  const isVideo = currentFile?.kind === 'video' || currentFile?.path?.endsWith('.mp4');
  const fileUrl = currentFile ? `/api/media/files/${currentFile.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.source_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-spring-pop">
      
      {/* Modal Card Enclosure */}
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col lg:flex-row rounded-[2.2rem] bg-[#EEF2F7] shadow-[16px_16px_36px_rgba(0,0,0,0.25),-10px_-10px_30px_rgba(255,255,255,0.9)] border border-white/90 overflow-hidden">
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-2xl bg-[#EEF2F7] shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff] text-slate-500 hover:text-slate-900 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
          title="Close Modal"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {/* Left Side: Media Preview Canvas */}
        <div className="flex-1 relative flex items-center justify-center bg-[#E5EBF2] p-4 sm:p-8 min-h-[300px] lg:min-h-[550px] overflow-hidden">
          {fileUrl ? (
            isVideo ? (
              <video
                key={fileUrl}
                src={fileUrl}
                controls
                autoPlay
                className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-md"
              />
            ) : (
              <img
                key={fileUrl}
                src={fileUrl}
                alt={item.caption || 'Media Detail'}
                className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-md"
              />
            )
          ) : (
            <div className="text-slate-400 text-sm">No preview available</div>
          )}

          {/* Carousel Arrows if multiple files */}
          {item.files.length > 1 && (
            <>
              <button
                onClick={() => setActiveFileIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeFileIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-[#EEF2F7]/90 backdrop-blur-md shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff] text-slate-700 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                ◀
              </button>
              <button
                onClick={() => setActiveFileIndex((prev) => Math.min(item.files.length - 1, prev + 1))}
                disabled={activeFileIndex === item.files.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-[#EEF2F7]/90 backdrop-blur-md shadow-[3px_3px_6px_#cbd5e1,-3px_-3px_6px_#ffffff] text-slate-700 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                ▶
              </button>
            </>
          )}

          {/* Carousel Pagination Dots */}
          {item.files.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2F7]/90 backdrop-blur-md shadow-[2px_2px_5px_#cbd5e1,-2px_-2px_5px_#ffffff]">
              {item.files.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    activeFileIndex === idx
                      ? 'bg-indigo-600 w-6'
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Metadata Sidecar */}
        <div className="w-full lg:w-96 p-6 sm:p-8 flex flex-col justify-between gap-6 overflow-y-auto max-h-[50vh] lg:max-h-full">
          
          <div className="flex flex-col gap-4">
            {/* Platform & Author */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200">
                {item.platform}
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                {item.username ? `@${item.username}` : 'Vault Item'}
              </span>
            </div>

            {/* Date & ID */}
            <div className="text-[11px] font-mono text-slate-400">
              Archived on {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
            </div>

            {/* Full Caption */}
            {item.caption && (
              <div className="p-4 rounded-2xl bg-[#E5EBF2] shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap max-h-48 overflow-y-auto">
                {item.caption}
              </div>
            )}
          </div>

          {/* Bottom Actions: Copy Link, Download Raw File */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
            {/* Copy Source Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-[#EEF2F7] shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] hover:text-indigo-600 active:shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <IconCheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Copied Link!</span>
                </>
              ) : (
                <>
                  <IconExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Copy Source URL</span>
                </>
              )}
            </button>

            {/* Download File */}
            {fileUrl && (
              <a
                href={fileUrl}
                download
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 shadow-[4px_4px_10px_rgba(79,70,229,0.35),-2px_-2px_6px_#ffffff] hover:bg-indigo-700 active:scale-98 transition-all text-center"
              >
                <IconDownload className="w-4 h-4 text-white" />
                <span>Save File to Device</span>
              </a>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
