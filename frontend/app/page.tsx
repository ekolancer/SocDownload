'use client';

import { useCallback, useEffect, useState, useRef } from 'react';

interface MediaFile {
  id: number;
  kind: 'image' | 'video';
  url: string;
  name: string;
}

interface MediaItem {
  id: number;
  platform: string;
  source_url: string;
  username: string | null;
  caption: string | null;
  posted_at: string | null;
  created_at: string | null;
  files: MediaFile[];
}

interface JobRow {
  id: number;
  platform: string;
  url: string;
  status: string;
  error: string | null;
  created_at: string;
}

type BackendStatus = 'loading' | 'ok' | 'offline';
type PlatformFilter = 'all' | 'instagram' | 'threads' | 'x' | 'tiktok';

const API = '/api';
const PLATFORMS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'threads', label: 'Threads' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
];

function detectPlatform(url: string): PlatformFilter {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) return 'instagram';
    if (hostname.includes('threads.net')) return 'threads';
    if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'x';
    if (hostname.includes('tiktok.com')) return 'tiktok';
  } catch {
    // ignore
  }
  return 'all';
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown date';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [mediaError, setMediaError] = useState('');
  const refreshRef = useRef<() => Promise<void>>();

  const refresh = useCallback(async () => {
    try {
      const healthRes = await fetch(`${API}/health`);
      setBackendStatus(healthRes.ok ? 'ok' : 'offline');
    } catch {
      setBackendStatus('offline');
    }

    try {
      const jobsRes = await fetch(`${API}/jobs`);
      if (!jobsRes.ok) throw new Error('Failed to fetch jobs');
      setJobs(await jobsRes.json());
    } catch (e) {
      console.error('Jobs fetch error:', e);
    }

    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      params.set('limit', '100');
      const mediaRes = await fetch(`${API}/media?${params.toString()}`);
      if (!mediaRes.ok) throw new Error('Failed to fetch media');
      setMedia(await mediaRes.json());
      setMediaError('');
    } catch (e) {
      setMediaError('Failed to load media library');
      console.error('Media fetch error:', e);
    }
  }, [platformFilter]);

  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
    const interval = setInterval(() => refresh(), 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const submit = async () => {
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Backend returned ${response.status}`);
      }
      setUrl('');
      await refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to reach backend');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !submitting) submit();
  };

  const filteredMedia = media;

  const statusLabel: Record<string, string> = {
    queued: 'Queued',
    running: 'Running',
    done: 'Done',
    failed: 'Failed',
    dup: 'Duplicate',
  };

  const statusClass: Record<string, string> = {
    queued: 'status-queued',
    running: 'status-running',
    done: 'status-done',
    failed: 'status-failed',
    dup: 'status-dup',
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="app-header">
        <div className="app-header-brand">MediaVault</div>
        <div className="app-header-status">
          <span className={`status-dot ${backendStatus === 'ok' ? 'online' : backendStatus === 'loading' ? 'loading' : 'offline'}`} aria-hidden="true" />
          <span>{backendStatus === 'ok' ? 'Backend online' : backendStatus === 'loading' ? 'Connecting…' : 'Backend offline'}</span>
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar" role="complementary" aria-label="Platform filters">
          <div>
            <h2 className="section-title" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-4)' }}>
              Platforms
            </h2>
            <div className="filter-group" role="group" aria-label="Filter by platform">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  className={`filter-btn ${platformFilter === p.value ? 'active' : ''}`}
                  onClick={() => setPlatformFilter(p.value)}
                  aria-pressed={platformFilter === p.value}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="app-main" role="main">
          <section className="workspace-section" aria-labelledby="composer-heading">
            <div className="section-header">
              <h2 id="composer-heading" className="section-title">Download</h2>
            </div>

            <form className="composer-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <label htmlFor="url-input" className="composer-label">
                Post URL
              </label>
              <div className="composer-input-group">
                <input
                  id="url-input"
                  type="url"
                  className="input"
                  placeholder="https://www.instagram.com/p/…  or  https://x.com/…/status/…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={submitting}
                  aria-describedby={submitError ? 'submit-error' : undefined}
                  aria-invalid={!!submitError}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !url.trim()}
                >
                  {submitting ? 'Enqueueing…' : 'Download'}
                </button>
              </div>
              {url && (
                <span className="platform-tag" aria-label={`Detected platform: ${detectPlatform(url)}`}>
                  {detectPlatform(url) !== 'all' ? detectPlatform(url) : 'Unknown platform'}
                </span>
              )}
              {submitError && (
                <p id="submit-error" className="error-inline" role="alert">{submitError}</p>
              )}
            </form>
          </section>

          <section className="workspace-section" aria-labelledby="jobs-heading">
            <div className="section-header">
              <h2 id="jobs-heading" className="section-title">Job History</h2>
            </div>

            {jobs.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No jobs yet</p>
                <p>Paste a post URL above to start downloading.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                {jobs.map((job) => (
                  <article key={job.id} className="job-row">
                    <span className="job-id">#{job.id}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="job-url" title={job.url}>{truncate(job.url, 80)}</div>
                      <span className="job-platform">{job.platform}</span>
                    </div>
                    <span className={`status-badge ${statusClass[job.status] || 'status-queued'}`}>
                      {statusLabel[job.status] || job.status}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-section" aria-labelledby="media-heading">
            <div className="section-header">
              <h2 id="media-heading" className="section-title">Media Library</h2>
            </div>

            {mediaError && (
              <div className="empty-state" style={{ color: 'var(--color-error)' }}>
                <p className="empty-state-title">Failed to load media</p>
                <p>{mediaError}</p>
              </div>
            )}

            {filteredMedia.length === 0 && !mediaError && (
              <div className="empty-state">
                <p className="empty-state-title">No media downloaded yet</p>
                <p>Completed downloads will appear here.</p>
              </div>
            )}

            {filteredMedia.length > 0 && (
              <div className="media-grid" role="list" aria-label="Downloaded media">
                {filteredMedia.map((item) => (
                  <article key={item.id} className="media-tile" role="listitem">
                    {item.files.length > 0 ? (
                      <div className="media-preview">
                        {item.files[0].kind === 'image' ? (
                          <img
                            src={item.files[0].url}
                            alt={item.caption || `${item.platform} post by ${item.username || 'unknown'}`}
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <video
                            src={item.files[0].url}
                            controls
                            preload="metadata"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="media-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                        No preview
                      </div>
                    )}
                    <div className="media-info">
                      <div className="media-platform">{item.platform}</div>
                      <div className="media-meta">
                        {item.username ? `@${item.username}` : 'Unknown user'}
                        {item.posted_at && ` · ${formatDate(item.posted_at)}`}
                      </div>
                      {item.caption && (
                        <p className="media-caption" title={item.caption}>{truncate(item.caption, 120)}</p>
                      )}
                      {!item.caption && (
                        <p className="media-caption" style={{ color: 'var(--color-text-muted)' }}>
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                            {truncate(item.source_url, 60)}
                          </a>
                        </p>
                      )}
                      {item.files.length > 1 && (
                        <p className="media-meta" style={{ marginTop: 'var(--spacing-2)' }}>
                          +{item.files.length - 1} more file{item.files.length - 1 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}