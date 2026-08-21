'use client';

import React, { useState, useRef } from 'react';
import {
  IconClose,
  IconUpload,
  IconCheckCircle,
  IconAlertCircle,
  IconSparkles,
} from './Icons';

interface ArchiveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  total_found: number;
  imported_count: number;
  skipped_dup_count: number;
  skipped_limit_count: number;
  limit: number;
  urls: string[];
}

export function ArchiveImportModal({ isOpen, onClose, onSuccess }: ArchiveImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
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

      const data: ImportResult = await res.json();
      setResult(data);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error processing archive file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-[28px] bg-white m3-elevation-4 border border-slate-200 p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <IconUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Import Url Metadata Bulk
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Official JSON & HTML exports from Instagram / X / TikTok / Threads
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.html,.htm,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-3 rounded-2xl bg-white border border-slate-200 text-indigo-600 mb-3 m3-elevation-1">
            <IconUpload className="w-6 h-6" />
          </div>

          {file ? (
            <div className="flex flex-col items-center">
              <span className="text-sm font-extrabold text-indigo-600 font-mono break-all">
                {file.name}
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-1">
                {(file.size / 1024).toFixed(1)} KB • Click or drop new file to replace
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-sm font-extrabold text-slate-700">
                Drop your JSON or HTML archive here
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports `saved_posts.html`, `saved_posts.json`, `liked_posts.html`, `.txt`
              </span>
            </div>
          )}
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Smart Success Feedback */}
        {result && (
          <div className="flex flex-col gap-2.5">
            {result.imported_count > 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Enqueued {result.imported_count} posts for download!</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-mono">
                  {result.total_found} URLs found in file.
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>All {result.total_found} URLs in this file have already been processed!</span>
              </div>
            )}

            {/* Skipped Duplicates Info */}
            {result.skipped_dup_count > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono">
                ⏭ <strong>{result.skipped_dup_count}</strong> URLs skipped (already downloaded or in queue).
              </div>
            )}

            {/* Batch Limit Remaining Guidance */}
            {result.skipped_limit_count > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1">
                  <span>⚠ Batch Limit:</span>
                  <span>{result.skipped_limit_count} URLs saved for next batch</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-sans">
                  Max <strong>{result.limit}</strong> URLs per batch. When this batch finishes downloading, simply <strong>upload this same file again</strong> to continue downloading the rest automatically without duplicates!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {result ? (
            <a
              href="/"
              onClick={() => onClose()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 m3-elevation-1 transition-all cursor-pointer shadow-md shadow-indigo-200"
            >
              <span>View Queue in Studio →</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed m3-elevation-1 transition-all cursor-pointer"
            >
              <IconSparkles className="w-4 h-4" />
              <span>{uploading ? 'Extracting & Queueing...' : 'Process Metadata'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
