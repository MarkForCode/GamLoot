'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/guild/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/market', icon: 'storefront', label: 'Marketplace' },
  { href: '/guild/bulletin', icon: 'campaign', label: 'Bulletin Board' },
  { href: '/guild/trade/new', icon: 'add_shopping_cart', label: 'Create Trade' },
  { href: '/guild/members', icon: 'group', label: 'Members' },
  { href: '/guild/revenue', icon: 'account_balance', label: 'Revenue Share' },
  { href: '/guild/supply', icon: 'inventory_2', label: 'Supply Hub' },
  { href: '/disputes', icon: 'gavel', label: 'Disputes' },
  { href: '/profile', icon: 'person', label: 'My Profile' },
  { href: '/subscription', icon: 'card_membership', label: 'Subscription' },
];

export function AppShell({ children, activeHref }: { children: React.ReactNode; activeHref?: string }) {
  const pathname = usePathname();
  const active = activeHref ?? pathname;

  return (
    <div className="min-h-screen flex bg-background font-inter">
      {/* Sidebar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-zinc-950 border-r border-zinc-800 z-40 overflow-y-auto">
        {/* Brand */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-sm mb-lg">
            <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-400 text-lg">shield</span>
            </div>
            <div>
              <h1 className="font-black text-cyan-400 text-lg leading-tight">GAM Trade</h1>
              <p className="text-zinc-500 text-xs">Pro League Guild</p>
            </div>
          </div>
          <button className="w-full py-2 px-4 border border-outline-variant text-primary-fixed-dim rounded hover:bg-surface-variant transition-colors flex items-center justify-center gap-sm text-body-sm">
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
            Switch Realm
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 py-lg px-sm space-y-1">
          {navItems.map((item) => {
            const isActive = active === item.href || (item.href !== '/' && active.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? 'nav-link-active' : 'nav-link'}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
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

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="fixed top-0 w-full lg:w-[calc(100%-16rem)] z-50 flex justify-between items-center px-6 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
          <div className="hidden md:flex gap-md">
            <Link href="/market" className="text-zinc-400 hover:text-zinc-100 transition-colors hover:bg-zinc-900/50 px-3 py-2 rounded text-body-sm">
              Marketplace
            </Link>
            <Link href="/guild/dashboard" className="text-zinc-400 hover:text-zinc-100 transition-colors hover:bg-zinc-900/50 px-3 py-2 rounded text-body-sm">
              Guild
            </Link>
            <Link href="/guild/revenue" className="text-zinc-400 hover:text-zinc-100 transition-colors hover:bg-zinc-900/50 px-3 py-2 rounded text-body-sm">
              Revenue
            </Link>
          </div>
          <div className="flex items-center gap-lg ml-auto">
            <Link
              href="/guild/trade/new"
              className="bg-primary-container text-on-primary-container px-4 py-2 rounded font-mono-data text-mono-data hover:opacity-90 active:scale-95 transition-all text-sm font-semibold"
            >
              Create Listing
            </Link>
            <div className="flex items-center gap-sm">
              <button className="text-zinc-400 hover:text-zinc-100 p-2 rounded-full hover:bg-zinc-900/50 transition-colors">
                <span className="material-symbols-outlined text-xl">notifications</span>
              </button>
              <Link href="/profile" className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mt-16 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
