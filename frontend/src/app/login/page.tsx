'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError('Password tidak cocok. Coba lagi.');
      setBusy(false);
      return;
    }
    router.push('/');
  }

  return (
    <main className="linear-dark-bg flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-10 text-white sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-500 text-lg font-black text-black shadow-lg shadow-emerald-500/20">M</div>
          <div><p className="text-lg font-bold tracking-tight">MediaVault</p><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Private archive</p></div>
        </div>
        <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">Local access</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Masukkan password vault untuk melanjutkan ke arsip pribadi.</p>
          <label className="mt-8 block text-sm font-semibold text-slate-300" htmlFor="vault-password">Vault password
            <input id="vault-password" autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#071221] px-4 py-3.5 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <button className="mt-6 w-full rounded-2xl bg-emerald-300 px-4 py-3.5 font-bold text-black transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Unlock vault'}</button>
          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-slate-600">Credentials stay on this server</p>
        </form>
      </div>
    </main>
  );
}
