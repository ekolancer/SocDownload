'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconAdapter, IconLayers, IconLogOut, IconSettings } from '@/components/ui/Icons';

const groups = [
  { label: 'MAIN', items: [{ href: '/', label: 'Studio', shortcut: '⌘1', icon: IconLayers }, { href: '/vault', label: 'Vault', shortcut: '⌘2', icon: IconLayers }] },
  { label: 'FEATURES', items: [{ href: '/console', label: 'Console', shortcut: '⌘3', icon: IconAdapter }] },
  { label: 'TOOLS', items: [{ href: '/settings', label: 'Settings', shortcut: '⌘4', icon: IconSettings }] },
];

export function DashboardSidebar({ mobileOpen, onClose, onOpenAdapters }: { mobileOpen: boolean; onClose: () => void; onOpenAdapters: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ MAIN: true, FEATURES: true, TOOLS: true });
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => setCollapsed(localStorage.getItem('dashboard-sidebar-collapsed') === 'true'), []);
  useEffect(() => { if (mobileOpen) firstLinkRef.current?.focus(); }, [mobileOpen]);

  function toggle() {
    setCollapsed((value) => { localStorage.setItem('dashboard-sidebar-collapsed', String(!value)); return !value; });
  }

  return <aside className={`fixed inset-y-0 left-0 z-40 border-r border-white/[0.08] bg-[#080b10]/95 p-4 backdrop-blur-xl transition-[width,transform] duration-300 md:block ${collapsed ? 'w-[76px]' : 'w-72'} ${mobileOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'}`}><div className="flex h-full flex-col"><div className={`mb-8 flex items-center gap-3 px-2 ${collapsed ? 'justify-center' : 'justify-between'}`}><Link href="/" onClick={onClose} className="text-lg font-black tracking-tight text-white">{collapsed ? 'M' : <>Media<span className="text-cyan-400">Vault</span></>}</Link><button type="button" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200">{collapsed ? '›' : '‹'}</button></div><nav className="flex flex-col gap-5" aria-label="Dashboard navigation">{groups.map((group) => <section key={group.label}><button type="button" onClick={() => setOpenGroups((value) => ({ ...value, [group.label]: !value[group.label] }))} className={`mb-2 flex w-full items-center justify-between px-3 font-mono text-[9px] font-bold tracking-[0.2em] text-slate-600 ${collapsed ? 'sr-only' : ''}`} aria-expanded={openGroups[group.label]}>{group.label}<span>{openGroups[group.label] ? '−' : '+'}</span></button>{openGroups[group.label] && <div className="flex flex-col gap-1">{group.items.map(({ href, label, shortcut, icon: Icon }, index) => { const active = href === '/' ? pathname === '/' : pathname.startsWith(href); return <Link ref={index === 0 && group.label === 'MAIN' ? firstLinkRef : undefined} key={href} href={href} aria-current={active ? 'page' : undefined} title={collapsed ? `${label} (${shortcut})` : undefined} onClick={onClose} className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border-t px-3 py-2.5 text-sm font-bold transition ${active ? 'border-cyan-400 bg-cyan-400/[0.09] text-white shadow-[0_-4px_18px_-8px_rgba(34,211,238,.9)]' : 'border-transparent text-slate-400 hover:bg-white/[0.045] hover:text-slate-100'} ${collapsed ? 'justify-center' : ''}`}><Icon className={`h-4 w-4 ${active ? 'text-cyan-300' : ''}`} />{!collapsed && <><span>{label}</span><span className="ml-auto font-mono text-[10px] text-slate-600">{shortcut}</span></>}</Link> })}</div>}</section>)}</nav><div className="mt-auto space-y-3">{!collapsed && <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 to-emerald-400/5 p-4"><p className="text-sm font-bold text-white">Upgrade to Pro</p><p className="mt-1 text-xs leading-5 text-slate-400">Unlock local archive capacity and faster workflows.</p><Link href="/settings" onClick={onClose} className="mt-3 block rounded-lg bg-cyan-300 px-3 py-2 text-center text-xs font-black text-slate-950">View archive options</Link></div>}<button type="button" onClick={onOpenAdapters} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-white/[0.05] hover:text-white ${collapsed ? 'justify-center' : ''}`}><IconLogOut className="h-4 w-4" />{!collapsed && 'System status'}</button></div></div></aside>;
}
