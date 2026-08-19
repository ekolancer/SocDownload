'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('loading');
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState([]);
  const [media, setMedia] = useState([]);

  const refresh = async () => {
    try {
      const r = await fetch('http://localhost:8000/api/health');
      if (r.ok) setStatus('ok');
      else setStatus('offline');
      const m = await fetch('http://localhost:8000/api/media');
      setMedia(await m.json());
      const j = await fetch('http://localhost:8000/api/jobs');
      setJobs([]);
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const submit = async () => {
    await fetch('http://localhost:8000/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    setUrl('');
    refresh();
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 720, margin: '40px auto' }}>
      <h1>MediaVault</h1>
      <p>Backend status: <strong>{status}</strong></p>
      <div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste post URL"
          style={{ width: 400, marginRight: 8 }}
        />
        <button onClick={submit}>Enqueue</button>
      </div>
      <h2>Media ({media.length})</h2>
      <ul>
        {media.map((m) => (
          <li key={m.id}>{m.platform} — {m.source_url}</li>
        ))}
      </ul>
    </main>
  );
}
