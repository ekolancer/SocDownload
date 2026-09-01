'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';

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
    <DashboardShell title="Operations Console" description="Live structured events and diagnostics.">
      <div className="hynex-console flex h-[calc(100vh-8.5rem)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-white/10 font-mono text-slate-300 shadow-2xl backdrop-blur-xl">
        <header className="hynex-header shrink-0">
          <div>
            <Link href="/" className="hynex-brand">MATRIX<span>CONSOLE</span></Link>
            <div className="hynex-route">/ operations / event stream</div>
          </div>
          <div className="hynex-metrics">
            <span className={connection === 'live' ? 'status-live' : connection === 'paused' ? 'status-paused' : 'status-offline'}>● {connection.toUpperCase()}</span>
            <span><b>{filtered.length}</b> / {events.length} EVENTS</span>
            <span className="metric-error">{errors} ERRORS</span>
          </div>
        </header>

        <section className="hynex-toolbar shrink-0">
          <div className="hynex-filter-label">FILTERS <span>LIVE QUERY</span></div>
          <div className="hynex-filters">
            <select aria-label="Source" value={source} onChange={(event) => setSource(event.target.value)} className="console-input"><option value="">ALL SOURCES</option>{sourceOptions.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Level" value={level} onChange={(event) => setLevel(event.target.value)} className="console-input"><option value="">ALL LEVELS</option>{levelOptions.map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Code" value={code} onChange={(event) => setCode(event.target.value)} className="console-input"><option value="">ALL CODES</option>{codeOptions.map((item) => <option key={item}>{item}</option>)}</select>
            <input aria-label="Search events" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payload..." className="console-input search-input" />
            <button type="button" onClick={() => setPaused((current) => !current)} className="console-button cursor-pointer">{paused ? 'RESUME' : 'PAUSE'}</button>
            <button type="button" aria-pressed={follow} onClick={() => setFollow((current) => !current)} className="console-button cursor-pointer">FOLLOW {follow ? 'ON' : 'OFF'}</button>
            <button type="button" onClick={download} disabled={!filtered.length} className="console-button cursor-pointer">EXPORT JSONL</button>
          </div>
        </section>

        <section className="hynex-content flex flex-1 min-h-0 flex-col overflow-hidden p-3 sm:p-4">
          {error && <div role="alert" className="hynex-alert shrink-0">{error}</div>}
          <div className="event-card flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-[#20343b] bg-[#0b1117]">
            <div className="event-head shrink-0">
              <span>TIME</span>
              <span>LEVEL</span>
              <span>SOURCE</span>
              <span>MESSAGE</span>
            </div>
            <div className="event-body flex-1 min-h-0 overflow-y-auto">
              {filtered.length === 0 && <div className="empty-state">NO MATCHING EVENTS</div>}
              {filtered.map((event, index) => {
                const timestamp = value(event, 'timestamp', 'time', 'created_at');
                const eventLevel = value(event, 'level', 'severity').toUpperCase() || 'INFO';
                const sourceName = value(event, 'source', 'logger') || '-';
                const requestId = value(event, 'request_id', 'requestId');
                const id = value(event, 'id', 'event_id');
                const danger = ['ERROR', 'FATAL', 'CRITICAL'].includes(eventLevel);
                const warning = ['WARN', 'WARNING'].includes(eventLevel);
                return (
                  <details key={eventId(event, index)} className="event-row">
                    <summary>
                      <time>{timestamp ? new Date(timestamp).toLocaleTimeString() : '--'}</time>
                      <span className={danger ? 'level-danger' : warning ? 'level-warning' : 'level-info'}>{eventLevel}</span>
                      <span className="source-name">{sourceName}</span>
                      <span className="event-message">{value(event, 'message') || JSON.stringify(event)}</span>
                    </summary>
                    <div className="event-detail">
                      <div className="detail-actions">
                        {id && <button type="button" onClick={() => copy(id)} className="console-button cursor-pointer">{copied === id ? 'COPIED' : `COPY EVENT ${id}`}</button>}
                        {requestId && <button type="button" onClick={() => copy(requestId)} className="console-button cursor-pointer">{copied === requestId ? 'COPIED' : `COPY REQUEST ${requestId}`}</button>}
                      </div>
                      <pre>{JSON.stringify(event, null, 2)}</pre>
                    </div>
                  </details>
                );
              })}
              <div ref={tailRef} />
            </div>
          </div>
        </section>
        <style jsx global>{`
          .hynex-console{background:#080b10;position:relative;isolation:isolate}
          .hynex-console:before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 85% 0%,#063b3b44,transparent 35%),linear-gradient(135deg,#080b10,#0b1118 55%,#071918)}
          .hynex-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid #1d3038;background:#080b10dd}
          .hynex-brand{font-size:0.95rem;font-weight:800;letter-spacing:.18em;color:#67e8f9}
          .hynex-brand span{color:#34d399}
          .hynex-route,.hynex-filter-label span{font-size:.62rem;color:#66808a;letter-spacing:.12em;margin-top:.25rem}
          .hynex-metrics{display:flex;gap:1.2rem;font-size:.68rem;color:#78909a}
          .hynex-metrics b{color:#d9f99d}
          .status-live{color:#34d399}
          .status-paused{color:#fbbf24}
          .status-offline,.metric-error{color:#fb7185}
          .hynex-toolbar{padding:0.85rem 1.5rem;border-bottom:1px solid #1d3038;background:#0d1319}
          .hynex-filter-label{font-size:.65rem;color:#a7f3d0;letter-spacing:.16em;margin-bottom:.5rem}
          .hynex-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 2fr auto auto auto;gap:.5rem}
          .console-input,.console-button{min-width:0;border:1px solid #263d46;background:#0a1016;color:#c7d9dc;padding:.5rem .65rem;font:inherit;font-size:.68rem;letter-spacing:.04em;border-radius:0.375rem}
          .console-input::placeholder{color:#58717a}
          .console-button{color:#8be9d0;border-color:#236356;background:#10231f;white-space:nowrap;transition:all .15s}
          .console-button:hover{background:#164038;color:#ffffff}
          .console-button:disabled{opacity:.3}
          .hynex-alert{padding:.6rem 1rem;margin-bottom:.75rem;border:1px solid #8b3348;background:#2b111a;color:#fda4af;font-size:.7rem;border-radius:0.375rem}
          .event-card{box-shadow:0 18px 50px #0005}
          .event-head,.event-row summary{display:grid;grid-template-columns:9rem 6rem 10rem minmax(0,1fr);gap:1rem;align-items:center}
          .event-head{padding:.65rem 1rem;background:#111a21;color:#5f8088;font-size:.6rem;letter-spacing:.14em;font-weight:700}
          .event-body::-webkit-scrollbar{width:6px}
          .event-body::-webkit-scrollbar-track{background:#0b1117}
          .event-body::-webkit-scrollbar-thumb{background:#1e353b;border-radius:3px}
          .event-body::-webkit-scrollbar-thumb:hover{background:#2a4b54}
          .event-row{border-top:1px solid #172930}
          .event-row summary{padding:.7rem 1rem;cursor:pointer;list-style:none;font-size:.72rem}
          .event-row summary:hover,.event-row[open] summary{background:#10221f}
          .event-row time{color:#66808a}
          .event-message{overflow:hidden;color:#c9d7d8;text-overflow:ellipsis;white-space:nowrap}
          .source-name{overflow:hidden;color:#67e8f9;text-overflow:ellipsis}
          .level-info{color:#6ee7b7}
          .level-warning{color:#fbbf24}
          .level-danger{color:#fb7185}
          .event-detail{border-top:1px solid #1d3937;padding:1rem;background:#091615}
          .detail-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem}
          .event-detail pre{margin:0;overflow:auto;white-space:pre-wrap;word-break:break-all;color:#8ddfc3;font-size:.7rem}
          .empty-state{padding:4rem;text-align:center;color:#55736f;font-size:.7rem;letter-spacing:.15em}
          @media(max-width:800px){
            .hynex-header,.hynex-toolbar,.hynex-content{padding-left:.75rem;padding-right:.75rem}
            .hynex-header{align-items:flex-start;gap:.75rem;flex-direction:column}
            .hynex-metrics{flex-wrap:wrap}
            .hynex-filters{grid-template-columns:1fr 1fr}
            .search-input{grid-column:span 2}
            .event-head{display:none}
            .event-row summary{grid-template-columns:1fr 1fr;gap:.45rem}
            .event-row summary .event-message{grid-column:span 2;white-space:normal}
            .event-row time{font-size:.62rem}
          }
          @media(prefers-reduced-motion:reduce){
            .console-button,.console-input{transition:none}
          }
        `}</style>
      </div>
    </DashboardShell>
  );
}
