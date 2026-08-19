'use client';

import { useCallback, useEffect, useState } from 'react';

interface MediaRow {
  id: number;
  platform: string;
  source_url: string;
  username: string | null;
  caption: string | null;
  posted_at: string | null;
  created_at: string;
}

interface JobRow {
  id: number;
  platform: string;
  url: string;
  status: string;
  error: string | null;
  created_at: string;
}

const API = 'http://localhost:8000/api';

export default function Home() {
  const [status, setStatus] = useState('loading');
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API}/health`);
      setStatus(r.ok ? 'ok' : 'offline');
      const j = await fetch(`${API}/jobs`);
      setJobs(await j.json());
      const m = await fetch(`${API}/media`);
      setMedia(await m.json());
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      setUrl('');
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'done':
        return 'green';
      case 'failed':
        return 'red';
      case 'running':
        return 'blue';
      case 'dup':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 760, margin: '40px auto', padding: '0 16px' }}>
      <h1>MediaVault</h1>
      <p>
        Backend status: <strong style={{ color: status === 'ok' ? 'green' : 'red' }}>{status}</strong>
      </p>
      <div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Instagram / X post URL"
          style={{ width: 440, padding: 8, marginRight: 8 }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} disabled={busy}>
          {busy ? 'Enqueueing…' : 'Download'}
        </button>
      </div>

      <h2>History</h2>
      {jobs.length === 0 ? (
        <p>No jobs yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'left' }}>Platform</th>
              <th style={{ textAlign: 'left' }}>URL</th>
              <th style={{ textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.id}</td>
                <td>{j.platform}</td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {j.url}
                </td>
                <td>
                  <span style={{ color: statusColor(j.status), fontWeight: 600 }}>{j.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Media Library</h2>
      {media.length === 0 ? (
        <p>No media downloaded yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {media.map((m) => (
            <div key={m.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{m.platform}</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {m.username || 'unknown'} · {m.posted_at?.slice(0, 10) || 'no date'}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all' }}>
                {m.caption?.slice(0, 80) || m.source_url}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
