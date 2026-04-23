import { useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Header } from '../Header';
import { IconRail } from '../IconRail';
import { Sidebar } from '../Sidebar';
import { StatusBar } from '../StatusBar';
import { useLayoutStore } from '../useLayoutStore';

/**
 * Compact shell — permanent icon rail, optional fly-out sidebar drawer, content, status bar.
 * The hamburger toggles the expanded drawer, so users can keep the rail permanent and only
 * pop the full sidebar when they need it.
 */
export function CompactShell() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);

  const closeDrawer = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Header variant="classic" />

      <div className="relative flex flex-1 overflow-hidden">
        <aside
          className="flex-shrink-0 overflow-visible border-r"
          style={{
            width: 'var(--rail-width)',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <IconRail />
        </aside>

        {/* Fly-out sidebar drawer — overlays content, does not push it */}
        <div
          className={clsx(
            'absolute left-0 top-0 z-30 h-full border-r',
            'transition-transform duration-[var(--duration-normal)] ease-[var(--ease-smooth)]',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{
            width: 'var(--sidebar-width)',
            marginLeft: 'var(--rail-width)',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            boxShadow: sidebarOpen ? 'var(--floating-shadow)' : 'none',
          }}
          aria-hidden={!sidebarOpen}
        >
          <Sidebar />
        </div>

        {/* Scrim catches clicks when the drawer is open */}
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={closeDrawer}
            className="absolute inset-0 z-20 cursor-default"
            style={{ marginLeft: 'var(--rail-width)' }}
          />
        )}

        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
