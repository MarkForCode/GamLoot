'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: 'dashboard', label: 'Dashboard', exact: true },
  { href: '/analytics', icon: 'bar_chart', label: 'Analytics' },
  { href: '/platforms', icon: 'videogame_asset', label: 'Game Platforms' },
  { href: '/disputes', icon: 'gavel', label: 'Disputes' },
  { href: '/billing', icon: 'receipt_long', label: 'Billing' },
  { href: '/audit', icon: 'manage_search', label: 'Audit Log' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href) && href !== '/';
  }

  return (
    <div className="min-h-screen flex bg-background font-inter">
      {/* Sidebar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-zinc-950 border-r border-zinc-800 z-40 overflow-y-auto">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-sm mb-lg">
            <div className="w-8 h-8 rounded bg-error/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-lg">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-black text-error text-lg leading-tight">GAM Admin</h1>
              <p className="text-zinc-500 text-xs">Platform Control</p>
            </div>
          </div>
        </div>

        <div className="flex-1 py-lg px-sm space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'nav-link-active' : 'nav-link'}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-1">
          <a href="#" className="nav-link py-2">
            <span className="material-symbols-outlined text-xl">help</span>
            <span>Support</span>
          </a>
          <a href="/login" className="nav-link py-2">
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Logout</span>
          </a>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="fixed top-0 w-full lg:w-[calc(100%-16rem)] z-50 flex justify-between items-center px-6 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
          <div className="flex items-center gap-md">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
              Platform Administration
            </span>
          </div>
          <div className="flex items-center gap-sm">
            <button className="text-zinc-400 hover:text-zinc-100 p-2 rounded-full hover:bg-zinc-900/50 transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center ml-2">
              <span className="material-symbols-outlined text-on-surface-variant text-base">person</span>
            </div>
          </div>
        </header>
        <main className="mt-16 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
