'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconClose,
  IconUpload,
  IconCheckCircle,
  IconAlertCircle,
  IconSparkles,
  IconFolderZip,
  IconCheck,
  IconBookmark,
} from '@/components/ui/Icons';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setError('');
      setResult(null);
      setUploading(false);
      setIsDragOver(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Enclosure */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 16, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="relative w-full max-w-lg p-1.5 sm:p-2 rounded-3xl bg-slate-900/90 border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl z-10 select-none my-auto"
          >
            {/* Inner Core Container */}
            <div className="relative rounded-2xl bg-slate-950/80 border border-white/[0.06] p-5 sm:p-7 flex flex-col gap-5">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-emerald-400 shadow-md shrink-0">
                    <IconUpload className="w-5 h-5 drop-shadow-xs" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded-md shadow-2xs">
                        Ingestion Module
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                      Import Archive Metadata
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-white/10 flex items-center justify-center shrink-0 transition-all duration-200 active:scale-95 cursor-pointer"
                  aria-label="Close Modal"
                  title="Close Modal"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>

              {/* Drag-and-Drop Ingestion Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-950/30 shadow-inner scale-[0.99]'
                    : file
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-emerald-500/50 bg-slate-900/40 hover:bg-slate-900/80 shadow-2xs'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Choose archive file"
                  accept=".json,.html,.htm,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
                      <IconFolderZip className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs sm:text-sm font-bold text-white font-mono break-all max-w-xs">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB • Click or drag to replace
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 text-emerald-400 flex items-center justify-center shadow-xs">
                      <IconUpload className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs sm:text-sm font-bold text-slate-200">
                        Drag and drop your export file here
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Supports <code className="font-mono font-bold text-slate-300">saved_posts.html</code>, <code className="font-mono font-bold text-slate-300">.json</code>, <code className="font-mono font-bold text-slate-300">.txt</code>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Feedback Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                  <IconAlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Outcome Grid */}
              {result && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  {/* Status Banner */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                      result.imported_count > 0
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/80 border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.imported_count > 0 ? (
                        <IconCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <IconBookmark className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold">
                        {result.imported_count > 0
                          ? `Enqueued ${result.imported_count} posts for download!`
                          : `Semua ${result.total_found} URL sudah ada di database.`}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300">
                      {result.total_found} Total
                    </span>
                  </div>

                  {/* Bento Metrics 3-Column Strip */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.08] flex flex-col items-center text-center shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Ditemukan</span>
                      <span className="text-base font-bold text-white font-mono mt-0.5">{result.total_found}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col items-center text-center shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">Enqueued</span>
                      <span className="text-base font-bold text-emerald-300 font-mono mt-0.5">+{result.imported_count}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex flex-col items-center text-center shadow-2xs">
                      <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">Di-skip</span>
                      <span className="text-base font-bold text-amber-300 font-mono mt-0.5">{result.skipped_dup_count}</span>
                    </div>
                  </div>

                  {/* Batch Limit Remaining Guidance */}
                  {result.skipped_limit_count > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-1 shadow-2xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Batch Limit: {result.skipped_limit_count} URL tersisa untuk batch berikutnya</span>
                      </div>
                      <p className="text-[11px] text-amber-400/80 leading-relaxed font-medium mt-0.5">
                        Maksimal {result.limit} URL per batch. Cukup upload file ini kembali setelah antrean selesai untuk mengunduh sisa URL secara otomatis.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  {result ? 'Selesai' : 'Batal'}
                </button>

                {result ? (
                  <a
                    href="/"
                    onClick={() => onClose()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 active:scale-95 shadow-md shadow-white/10 transition-all cursor-pointer"
                  >
                    <span>Lihat Antrean di Studio</span>
                    <span>→</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-white/10 transition-all cursor-pointer"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2 font-mono">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950/40 border-t-slate-950 animate-spin shrink-0" />
                        <span>Mengekstrak Metadata...</span>
                      </span>
                    ) : (
                      <>
                        <IconSparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>Proses File Metadata</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
