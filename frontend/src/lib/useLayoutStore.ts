'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';

export interface LayoutState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  adaptersDrawerOpen: boolean;
}

const STORAGE_KEY = 'mediavault-sidebar-collapsed';

// Initial state
let state: LayoutState = {
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  adaptersDrawerOpen: false,
};

// Initialize from localStorage if in client
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      state.sidebarCollapsed = saved === 'true';
    }
  } catch {
    // Ignore storage access errors
  }
}

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function updateState(updater: (prev: LayoutState) => Partial<LayoutState>) {
  const updates = updater(state);
  state = { ...state, ...updates };
  
  if (typeof window !== 'undefined' && updates.sidebarCollapsed !== undefined) {
    try {
      localStorage.setItem(STORAGE_KEY, String(updates.sidebarCollapsed));
    } catch {
      // Ignore storage errors
    }
  }
  
  emitChange();
}

export const layoutStore = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  
  toggleSidebar: () => {
    updateState((prev) => ({ sidebarCollapsed: !prev.sidebarCollapsed }));
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    updateState(() => ({ sidebarCollapsed: collapsed }));
  },
  
  openMobileSidebar: () => {
    updateState(() => ({ mobileSidebarOpen: true }));
  },
  closeMobileSidebar: () => {
    updateState(() => ({ mobileSidebarOpen: false }));
  },
  setMobileSidebarOpen: (open: boolean) => {
    updateState(() => ({ mobileSidebarOpen: open }));
  },
  
  openCommandPalette: () => {
    updateState(() => ({ commandPaletteOpen: true }));
  },
  closeCommandPalette: () => {
    updateState(() => ({ commandPaletteOpen: false }));
  },
  setCommandPaletteOpen: (open: boolean) => {
    updateState(() => ({ commandPaletteOpen: open }));
  },
  
  openAdaptersDrawer: () => {
    updateState(() => ({ adaptersDrawerOpen: true }));
  },
  closeAdaptersDrawer: () => {
    updateState(() => ({ adaptersDrawerOpen: false }));
  },
  setAdaptersDrawerOpen: (open: boolean) => {
    updateState(() => ({ adaptersDrawerOpen: open }));
  },
};

export function useLayoutStore(): LayoutState & typeof layoutStore {
  const snapshot = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot,
    () => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      commandPaletteOpen: false,
      adaptersDrawerOpen: false,
    })
  );

  return {
    ...snapshot,
    ...layoutStore,
  };
}
