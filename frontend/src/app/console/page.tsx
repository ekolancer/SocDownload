'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type LogEvent = Record<string, unknown> & {
  id?: string;
  event_id?: string;
  timestamp?: string;
  time?: string;
  created_at?: string;
  source?: string;
  logger?: string;
  level?: string;
  severity?: string;
  code?: string;
  message?: string;
  request_id?: string;
  requestId?: string;
};

type Connection = 'connecting' | 'live' | 'offline' | 'paused';

const HISTORY_URL = '/api/console/events';
const STREAM_URL = '/api/console/stream';
const STATS_URL = '/api/console/stats';
const MAX_EVENTS = 2000;

function value(event: LogEvent, ...keys: (keyof LogEvent)[]) {
  for (const key of keys) {
    const candidate = event[key];
    if (candidate !== undefined && candidate !== null) return String(candidate);
  }
  return '';
}

function eventId(event: LogEvent, index: number) {
  return value(event, 'id', 'event_id') || `${value(event, 'timestamp', 'time', 'created_at')}-${index}`;
}

function normalize(payload: unknown): LogEvent[] {
  if (Array.isArray(payload)) return payload.filter((item): item is LogEvent => Boolean(item) && typeof item === 'object');
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    for (const key of ['events', 'items', 'logs', 'data']) {
      if (Array.isArray(data[key])) return normalize(data[key]);
    }
  }
  return [];
}

function options(events: LogEvent[], getter: (event: LogEvent) => string) {
  return [...new Set(events.map(getter).filter(Boolean))].sort();
}

export default function ConsolePage() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [source, setSource] = useState('');
  const [level, setLevel] = useState('');
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const tailRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) setConnection('paused');
  }, [paused]);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function connect() {
      try {
        const history = await apiFetch(`${HISTORY_URL}?limit=500`);
        if (!history.ok) throw new Error(`History unavailable (${history.status})`);
        if (active) setEvents(normalize(await history.json()).slice(-MAX_EVENTS));

        controller = new AbortController();
        const response = await apiFetch(STREAM_URL, { headers: { Accept: 'text/event-stream' }, signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`Stream unavailable (${response.status})`);
        if (active && !pausedRef.current) setConnection('live');
        setError('');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (active) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true }).replace(/\r/g, '');
          const packets = buffer.split('\n\n');
          buffer = packets.pop() || '';
          for (const packet of packets) {
            const data = packet.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
            if (!data || data === '[DONE]' || pausedRef.current) continue;
            try {
              const incoming = normalize(JSON.parse(data));
              const additions = incoming.length ? incoming : [JSON.parse(data) as LogEvent];
              setEvents((current) => [...current, ...additions].slice(-MAX_EVENTS));
            } catch {
              setEvents((current) => [...current, { timestamp: new Date().toISOString(), source: 'stream', level: 'INFO', message: data }].slice(-MAX_EVENTS));
            }
          }
        }
        if (active) throw new Error('Stream disconnected');
      } catch (reason) {
        if (!active) return;
        setConnection('offline');
        setError(reason instanceof Error ? reason.message : 'Console unavailable');
      }
    }

    connect();
    return () => {
      active = false;
      controller?.abort();
    };
  }, []);

  const filtered = useMemo(() => events.filter((event) => {
    const haystack = JSON.stringify(event).toLowerCase();
    return (!source || value(event, 'source', 'logger') === source)
      && (!level || value(event, 'level', 'severity').toUpperCase() === level)
      && (!code || value(event, 'code') === code)
      && (!search || haystack.includes(search.toLowerCase()));
  }), [events, source, level, code, search]);

  useEffect(() => {
    if (follow) tailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [filtered.length, follow]);

  async function copy(text: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied(''), 1200);
  }

  function download() {
    const blob = new Blob([filtered.map((event) => JSON.stringify(event)).join('\n') + '\n'], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `matrixconsole-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const sourceOptions = options(events, (event) => value(event, 'source', 'logger'));
  const levelOptions = options(events, (event) => value(event, 'level', 'severity').toUpperCase());
  const codeOptions = options(events, (event) => value(event, 'code'));
  const errors = filtered.filter((event) => ['ERROR', 'CRITICAL', 'FATAL'].includes(value(event, 'level', 'severity').toUpperCase())).length;

  return (
    <main className="matrix-console min-h-screen bg-[#020704] font-mono text-[#8dffae]">
      <header className="border-b border-emerald-500/30 bg-black/80 px-4 py-3 shadow-[0_0_30px_rgba(16,185,129,.08)]">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4"><Link href="/" className="font-black tracking-[.2em] text-emerald-300">MATRIXCONSOLE</Link><span className="text-xs text-emerald-700">/console</span></div>
          <div className="flex items-center gap-4 text-xs"><span className={connection === 'live' ? 'text-emerald-300' : connection === 'paused' ? 'text-amber-300' : 'text-rose-400'}>● {connection.toUpperCase()}</span><span>{filtered.length}/{events.length} EVENTS</span><span className="text-rose-400">{errors} ERRORS</span></div>
        </div>
      </header>

      <section className="sticky top-0 z-10 border-b border-emerald-500/20 bg-[#020704]/95 p-3 backdrop-blur">
        <div className="mx-auto grid max-w-[1800px] gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto_auto_auto]">
          <select aria-label="Source" value={source} onChange={(event) => setSource(event.target.value)} className="console-input"><option value="">ALL SOURCES</option>{sourceOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Level" value={level} onChange={(event) => setLevel(event.target.value)} className="console-input"><option value="">ALL LEVELS</option>{levelOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Code" value={code} onChange={(event) => setCode(event.target.value)} className="console-input"><option value="">ALL CODES</option>{codeOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <input aria-label="Search events" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SEARCH PAYLOAD..." className="console-input" />
          <button type="button" onClick={() => setPaused((current) => !current)} className="console-button">{paused ? 'RESUME' : 'PAUSE'}</button>
          <button type="button" aria-pressed={follow} onClick={() => setFollow((current) => !current)} className="console-button">FOLLOW {follow ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={download} disabled={!filtered.length} className="console-button disabled:opacity-30">DOWNLOAD</button>
        </div>
      </section>

      <section className="mx-auto max-w-[1800px] p-3">
        {error && <div role="alert" className="mb-3 border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300">{error}</div>}
        <div className="overflow-hidden border border-emerald-500/20 bg-black/50">
          {filtered.length === 0 && <div className="p-8 text-center text-xs text-emerald-800">NO MATCHING EVENTS</div>}
          {filtered.map((event, index) => {
            const timestamp = value(event, 'timestamp', 'time', 'created_at');
            const eventLevel = value(event, 'level', 'severity').toUpperCase() || 'INFO';
            const sourceName = value(event, 'source', 'logger') || '-';
            const requestId = value(event, 'request_id', 'requestId');
            const id = value(event, 'id', 'event_id');
            return (
              <details key={eventId(event, index)} className="group border-b border-emerald-500/10 open:bg-emerald-950/10">
                <summary className="grid cursor-pointer list-none gap-2 px-3 py-2 text-xs hover:bg-emerald-950/20 sm:grid-cols-[12rem_6rem_10rem_1fr]">
                  <time className="text-emerald-700">{timestamp ? new Date(timestamp).toLocaleString() : '--'}</time>
                  <span className={eventLevel === 'ERROR' || eventLevel === 'FATAL' || eventLevel === 'CRITICAL' ? 'text-rose-400' : eventLevel === 'WARN' || eventLevel === 'WARNING' ? 'text-amber-300' : 'text-emerald-300'}>{eventLevel}</span>
                  <span className="truncate text-cyan-400">{sourceName}</span>
                  <span className="break-words text-emerald-100">{value(event, 'message') || JSON.stringify(event)}</span>
                </summary>
                <div className="border-t border-emerald-500/10 px-3 py-3 text-xs">
                  <div className="mb-3 flex flex-wrap gap-2">{id && <button type="button" onClick={() => copy(id)} className="console-button">{copied === id ? 'COPIED' : `COPY EVENT ${id}`}</button>}{requestId && <button type="button" onClick={() => copy(requestId)} className="console-button">{copied === requestId ? 'COPIED' : `COPY REQUEST ${requestId}`}</button>}</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all text-emerald-400">{JSON.stringify(event, null, 2)}</pre>
                </div>
              </details>
            );
          })}
          <div ref={tailRef} />
        </div>
      </section>
      <style jsx global>{`
        .matrix-console { position: relative; isolation: isolate; }
        .matrix-console::before { content: '01001101 01000101 01000100 01001001 01000001 01010110 01000001 01010101 01001100 01010100'; position: fixed; inset: 0; z-index: -1; overflow: hidden; color: rgb(16 185 129 / .035); font-size: 1.25rem; line-height: 2.5rem; letter-spacing: .8rem; word-break: break-all; pointer-events: none; animation: matrix-drift 24s linear infinite; }
        @keyframes matrix-drift { from { transform: translateY(-3rem); } to { transform: translateY(3rem); } }
        .console-input { min-width: 0; border: 1px solid rgb(16 185 129 / .25); background: #020704; padding: .55rem .7rem; color: #8dffae; font: inherit; font-size: .75rem; }
        .console-input::placeholder { color: rgb(6 95 70); }
        .console-button { border: 1px solid rgb(16 185 129 / .35); background: rgb(6 78 59 / .16); padding: .55rem .7rem; color: #8dffae; font: inherit; font-size: .7rem; white-space: nowrap; }
        .console-button:hover { background: rgb(6 95 70 / .35); }
        @media (prefers-reduced-motion: reduce) { .console-button, .console-input { transition: none; } .matrix-console::before { animation: none; } }
      `}</style>
    </main>
  );
}
