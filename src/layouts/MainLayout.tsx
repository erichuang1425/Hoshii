import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { useLayoutStore } from './useLayoutStore';

/**
 * Main application layout with collapsible sidebar, header, content area, and status bar.
 */
export function MainLayout() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header spans full width */}
      <Header />

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={clsx(
            'flex-shrink-0 overflow-hidden border-r',
            'transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-smooth)]',
          )}
          style={{
            width: sidebarOpen ? 'var(--sidebar-width)' : '0px',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <div style={{ width: 'var(--sidebar-width)' }}>
            <Sidebar />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
