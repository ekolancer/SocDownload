'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLayoutStore } from './useLayoutStore';

export function useDashboardShortcuts() {
  const router = useRouter();
  const {
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    closeMobileSidebar,
    mobileSidebarOpen,
    closeAdaptersDrawer,
    adaptersDrawerOpen,
    toggleSidebar,
  } = useLayoutStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Handle Escape for all overlays
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          e.preventDefault();
          closeCommandPalette();
          return;
        }
        if (mobileSidebarOpen) {
          e.preventDefault();
          closeMobileSidebar();
          return;
        }
        if (adaptersDrawerOpen) {
          e.preventDefault();
          closeAdaptersDrawer();
          return;
        }
      }

      // Command Palette: ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // Quick slash / shortcut when outside input
      if (!isInput && e.key === '/') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Toggle Sidebar: ⌘B or Ctrl+B
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Navigation shortcuts: ⌘1, ⌘2, ⌘3, ⌘4 (or Ctrl+1..4)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          router.push('/');
        } else if (e.key === '2') {
          e.preventDefault();
          router.push('/vault');
        } else if (e.key === '3') {
          e.preventDefault();
          router.push('/console');
        } else if (e.key === '4') {
          e.preventDefault();
          router.push('/settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    router,
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    closeMobileSidebar,
    mobileSidebarOpen,
    closeAdaptersDrawer,
    adaptersDrawerOpen,
    toggleSidebar,
  ]);
}
