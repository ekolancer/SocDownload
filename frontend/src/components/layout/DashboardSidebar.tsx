'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconLayers,
  IconVideoCamera,
  IconActivity,
  IconSettings,
  IconLogOut,
  IconChevronLeft,
  IconChevronRight,
  IconMediaVault,
} from '@/components/ui/Icons';
import { useLayoutStore } from '@/lib/useLayoutStore';

interface NavItem {
  href: string;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: 'WORKSPACE',
    items: [
      { href: '/', label: 'Studio', shortcut: '⌘1', icon: IconLayers },
      { href: '/vault', label: 'Vault', shortcut: '⌘2', icon: IconVideoCamera },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { href: '/console', label: 'Console', shortcut: '⌘3', icon: IconActivity },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { href: '/settings', label: 'Settings', shortcut: '⌘4', icon: IconSettings },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    closeMobileSidebar,
    openAdaptersDrawer,
  } = useLayoutStore();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    WORKSPACE: true,
    OPERATIONS: true,
    CONFIGURATION: true,
  });

  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Focus trap initiation on mobile open
  useEffect(() => {
    if (mobileSidebarOpen) {
      firstLinkRef.current?.focus();
    }
  }, [mobileSidebarOpen]);

  const handleLogout = async () => {
    closeMobileSidebar();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Proceed to login anyway
    }
    router.push('/login');
  };

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.08] bg-[#070b10]/95 backdrop-blur-2xl transition-[width,transform] duration-300 ease-in-out md:block ${
        sidebarCollapsed ? 'w-[76px]' : 'w-72'
      } ${
        mobileSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      aria-label="Main Sidebar Navigation"
    >
      <div className="flex h-full flex-col justify-between p-3.5 sm:p-4">
        {/* Top: Header & Brand */}
        <div>
          <div
            className={`mb-6 flex items-center ${
              sidebarCollapsed
                ? 'flex-col gap-3 justify-center'
                : 'justify-between px-1.5'
            }`}
          >
            <Link
              href="/"
              onClick={closeMobileSidebar}
              className="group flex items-center gap-2.5 min-w-0"
              aria-label="MediaVault Home"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/20 transition-transform group-hover:scale-105">
                <span className="font-mono text-base font-black text-slate-950">M</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-base font-black tracking-tight text-white leading-none">
                    Media<span className="text-cyan-400">Vault</span>
                  </span>
                  <span className="font-mono text-[9px] tracking-widest text-slate-500 uppercase mt-0.5">
                    Studio v0.1
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse toggle (Desktop only) */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
              aria-expanded={!sidebarCollapsed}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-all hover:border-cyan-400/40 hover:bg-white/[0.05] hover:text-white cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            >
              {sidebarCollapsed ? (
                <IconChevronRight className="h-4 w-4" />
              ) : (
                <IconChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="flex flex-col gap-4" aria-label="Dashboard routes">
            {groups.map((group) => {
              const isGroupOpen = openGroups[group.label] ?? true;
              return (
                <div key={group.label} className="space-y-1">
                  {/* Category Header */}
                  {!sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center justify-between px-2.5 py-1 text-left font-mono text-[10px] font-bold tracking-[0.16em] text-slate-500 hover:text-slate-300 transition-colors"
                      aria-expanded={isGroupOpen}
                    >
                      <span>{group.label}</span>
                      <span className="text-xs text-slate-600">{isGroupOpen ? '−' : '+'}</span>
                    </button>
                  )}

                  {/* Group Items: If sidebar is collapsed, ALWAYS show all icons so navigation is never trapped */}
                  {(sidebarCollapsed || isGroupOpen) && (
                    <div className="flex flex-col gap-1">
                      {group.items.map(({ href, label, shortcut, icon: Icon }, itemIndex) => {
                        const active =
                          href === '/' ? pathname === '/' : pathname.startsWith(href);

                        return (
                          <div key={href} className="relative group/nav">
                            <Link
                              ref={
                                itemIndex === 0 && group.label === 'WORKSPACE'
                                  ? firstLinkRef
                                  : undefined
                              }
                              href={href}
                              onClick={closeMobileSidebar}
                              aria-current={active ? 'page' : undefined}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 ${
                                active
                                  ? 'border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_20px_-6px_rgba(34,211,238,0.3)]'
                                  : 'border border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.04] hover:text-slate-100'
                              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                            >
                              <Icon
                                className={`h-4 w-4 shrink-0 transition-colors ${
                                  active
                                    ? 'text-cyan-300'
                                    : 'text-slate-400 group-hover/nav:text-white'
                                }`}
                              />

                              {!sidebarCollapsed && (
                                <>
                                  <span className="truncate">{label}</span>
                                  <span className="ml-auto font-mono text-[10px] text-slate-600 group-hover/nav:text-slate-400 transition-colors">
                                    {shortcut}
                                  </span>
                                </>
                              )}
                            </Link>

                            {/* Floating sleek tooltip for collapsed mode */}
                            {sidebarCollapsed && (
                              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden items-center gap-2 rounded-lg border border-white/15 bg-slate-900/95 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-xl group-hover/nav:flex z-50 whitespace-nowrap">
                                <span>{label}</span>
                                <span className="font-mono text-[10px] text-cyan-400">{shortcut}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: System Status & Utilities */}
        <div className="mt-auto space-y-2 pt-4 border-t border-white/[0.08]">
          {/* Server Info Card (Expanded mode only) */}
          {!sidebarCollapsed && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-slate-400">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Self-Hosted Node
                </span>
                <span className="font-mono text-[10px] text-slate-500">v0.1</span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Local SQLite Vault & Engine Active
              </p>
            </div>
          )}

          {/* System Adapters Action Button */}
          <div className="relative group/nav">
            <button
              type="button"
              onClick={() => {
                closeMobileSidebar();
                openAdaptersDrawer();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 transition-all hover:border-white/5 hover:bg-white/[0.04] hover:text-white ${
                sidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <IconActivity className="h-4 w-4 shrink-0 text-cyan-400" />
              {!sidebarCollapsed && <span>System Status</span>}
            </button>

            {sidebarCollapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden rounded-lg border border-white/15 bg-slate-900/95 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-xl group-hover/nav:flex z-50 whitespace-nowrap">
                System Status & Adapters
              </div>
            )}
          </div>

          {/* Logout Action */}
          <div className="relative group/nav">
            <button
              type="button"
              onClick={handleLogout}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition-all hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-300 ${
                sidebarCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <IconLogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>

            {sidebarCollapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden rounded-lg border border-rose-400/30 bg-slate-900/95 px-2.5 py-1.5 text-xs font-semibold text-rose-300 shadow-xl backdrop-blur-xl group-hover/nav:flex z-50 whitespace-nowrap">
                Logout
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
