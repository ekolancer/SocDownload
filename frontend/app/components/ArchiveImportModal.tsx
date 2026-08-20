'use client';

import React, { useState, useRef } from 'react';
import {
  IconClose,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconSparkles,
} from './Icons';

interface ArchiveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ArchiveImportModal({ isOpen, onClose, onSuccess }: ArchiveImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported_count: number; urls: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import/json', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg flex flex-col rounded-2xl glass-panel-elevated border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#12141F]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <IconUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Import Archive (JSON)
              </h3>
              <p className="text-xs text-slate-400">
                Bulk ingest from official Instagram, X, or TikTok exported data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {!result ? (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-white/15 hover:border-indigo-500/50 bg-white/[0.02] hover:bg-indigo-500/[0.03] transition-all cursor-pointer text-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                  <IconUpload className="w-6 h-6" />
                </div>
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-slate-100 font-mono">{file.name}</span>
                    <span className="text-xs text-indigo-400 font-medium">Click or drop to replace file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold text-slate-200">
                      Drop official JSON archive here, or <span className="text-indigo-400 underline">browse</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      Supports `saved_posts.json`, `likes.json`, `bookmarks.json`
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                  <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full py-3 rounded-lg text-sm font-bold gradient-btn-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Parsing & Enqueueing...</span>
                  </>
                ) : (
                  <span>Import Archive to Queue</span>
                )}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <IconCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Import Successful!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Enqueued <strong className="text-emerald-400 font-mono">{result.imported_count}</strong> post URLs to the download queue.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full mt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                >
                  View Queue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
