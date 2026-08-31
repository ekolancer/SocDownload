'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconAdapter, IconLayers, IconLogOut, IconSettings } from '@/components/ui/Icons';

const items = [
  { href: '/', label: 'Studio', icon: IconLayers },
  { href: '/vault', label: 'Vault', icon: IconLayers },
  { href: '/console', label: 'Console', icon: IconAdapter },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

export function DashboardSidebar({ mobileOpen, onClose, onOpenAdapters }: { mobileOpen: boolean; onClose: () => void; onOpenAdapters: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem('dashboard-sidebar-collapsed') === 'true');
  }, []);

  useEffect(() => {
    if (mobileOpen) firstLinkRef.current?.focus();
  }, [mobileOpen]);

  function toggle() {
    setCollapsed((value) => {
      localStorage.setItem('dashboard-sidebar-collapsed', String(!value));
      return !value;
    });
  }

  return <aside className={`fixed inset-y-0 left-0 z-40 border-r border-white/[0.08] bg-slate-950/95 p-3 backdrop-blur-xl transition-[width,transform] duration-200 md:block ${collapsed ? 'w-[72px]' : 'w-64'} ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0'}`}><div className="flex h-full flex-col"><div className="mb-8 flex items-center justify-between gap-2 px-2">{!collapsed && <span className="text-lg font-black tracking-tight text-white">Media<span className="text-emerald-400">Vault</span></span>}<button type="button" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white">{collapsed ? '›' : '‹'}</button></div><nav className="flex flex-col gap-2" aria-label="Dashboard navigation">{items.map(({ href, label, icon: Icon }, index) => { const active = href === '/' ? pathname === '/' : pathname.startsWith(href); return <Link ref={index === 0 ? firstLinkRef : undefined} key={href} href={href} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}><Icon className="h-4 w-4 shrink-0" /><span className={collapsed ? 'sr-only' : ''}>{label}</span></Link>; })}<button type="button" onClick={() => { onOpenAdapters(); onClose(); }} title={collapsed ? 'Adapters' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-400 transition hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}><IconAdapter className="h-4 w-4 shrink-0" /><span className={collapsed ? 'sr-only' : ''}>Adapters</span></button></nav><button type="button" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/login'; }} title={collapsed ? 'Logout' : undefined} className={`mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 ${collapsed ? 'justify-center' : ''}`}><IconLogOut className="h-4 w-4 shrink-0" /><span className={collapsed ? 'sr-only' : ''}>Logout</span></button></div></aside>;
}
