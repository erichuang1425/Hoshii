import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { StatusBar } from '../StatusBar';
import { useLayoutStore } from '../useLayoutStore';

/**
 * Classic shell — fixed header, collapsible sidebar, scrollable content, status bar.
 */
export function ClassicShell() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Header variant="classic" />

      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
