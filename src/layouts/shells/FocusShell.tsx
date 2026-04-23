import { useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { useLayoutStore } from '../useLayoutStore';

/**
 * Focus shell — floating translucent header, full-bleed content, no status bar.
 * Navigation lives in a temporary drawer that opens via the hamburger and closes on Escape.
 */
export function FocusShell() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);

  const closeDrawer = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);

  // Default to closed when entering focus mode so the floating UI stays unobstructed.
  // We don't persist this close, so switching back to classic still finds the sidebar open.
  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen, closeDrawer]);

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Floating header overlays the content area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <div className="pointer-events-auto">
          <Header variant="floating" />
        </div>
      </div>

      {/* Full-bleed content with top padding equal to floating header + margin */}
      <main
        className="flex-1 overflow-auto"
        style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
      >
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Drawer scrim */}
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={closeDrawer}
          className="absolute inset-0 z-30"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            animation: 'fadeIn var(--duration-fast) var(--ease-smooth)',
          }}
        />
      )}

      {/* Floating drawer */}
      <aside
        className={clsx(
          'absolute left-3 top-3 bottom-3 z-40 flex flex-col overflow-hidden rounded-xl border',
          'transition-transform duration-[var(--duration-normal)] ease-[var(--ease-smooth)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]',
        )}
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--floating-shadow)',
        }}
        aria-hidden={!sidebarOpen}
      >
        <Sidebar />
      </aside>
    </div>
  );
}
