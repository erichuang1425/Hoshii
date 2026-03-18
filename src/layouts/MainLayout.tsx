import { Outlet } from 'react-router-dom';

/**
 * Main application layout with sidebar, header, content area, and status bar.
 * Sidebar/Header/StatusBar components are implemented in Task 3.1 (Layouts).
 * For now, renders content area with placeholder chrome.
 */
export function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden"
         style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar — Task 3.1 */}
      <aside
        className="flex-shrink-0 flex flex-col border-r"
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="flex items-center px-4 font-semibold"
          style={{
            height: 'var(--header-height)',
            color: 'var(--accent)',
          }}
        >
          Hoshii
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Sidebar nav items — Task 3.1 */}
          <p
            className="px-2 py-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Sidebar placeholder
          </p>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header — Task 3.1 */}
        <header
          className="flex items-center justify-between border-b px-4"
          style={{
            height: 'var(--header-height)',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            Header placeholder
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>

        {/* Status bar — Task 3.1 */}
        <footer
          className="flex items-center gap-4 border-t px-4 text-xs"
          style={{
            height: '28px',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          Status bar placeholder
        </footer>
      </div>
    </div>
  );
}
