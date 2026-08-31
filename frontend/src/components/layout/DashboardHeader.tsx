'use client';

import { RefObject, useEffect, useState } from 'react';
import { IconMenu } from '@/components/ui/Icons';
import { apiFetch } from '@/lib/api';

export function DashboardHeader({ title, description, onOpenMenu, triggerRef }: { title: string; description?: string; onOpenMenu: () => void; triggerRef: RefObject<HTMLButtonElement> }) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await apiFetch('/api/health', { signal: AbortSignal.timeout(4000) });
        if (active) setOnline(response.ok);
      } catch {
        if (active) setOnline(false);
      }
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-slate-950/70 px-4 py-4 backdrop-blur-xl sm:px-6 md:px-8"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><div className="flex items-center gap-3"><button ref={triggerRef} type="button" onClick={onOpenMenu} className="rounded-lg border border-white/10 p-2 text-slate-400 md:hidden" aria-label="Open dashboard menu" aria-expanded="false"><IconMenu className="h-5 w-5" /></button><div><h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h1>{description && <p className="mt-1 text-xs text-slate-400">{description}</p>}</div></div><span role="status" aria-live="polite" className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${online === true ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : online === false ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>{online === true ? 'Online' : online === false ? 'Offline' : 'Connecting'}</span></div></header>;
}
