import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { TopNav } from '../TopNav';
import { StatusBar } from '../StatusBar';

/**
 * Top-nav shell — header + horizontal pill nav + full-width content + status bar.
 * No sidebar; the hamburger is hidden because navigation is inline in TopNav.
 */
export function TopShell() {
  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Header variant="bare" hideMenu />
      <TopNav />

      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>

      <StatusBar />
    </div>
  );
}
