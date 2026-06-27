'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/AppShell';

type Tab = 'inventory' | 'listings' | 'history';

const inventoryItems = [
  { id: 1, name: 'Void Blade', icon: 'swords', rarity: 'legendary', color: 'border-secondary shadow-[inset_0_0_8px_rgba(236,178,255,0.15)]', dotColor: 'bg-secondary shadow-[0_0_5px_#ecb2ff]', iconColor: 'text-secondary' },
  { id: 2, name: 'Aegis Core', icon: 'shield', rarity: 'epic', color: 'border-surface-tint shadow-[inset_0_0_8px_rgba(0,219,233,0.1)]', dotColor: 'bg-surface-tint shadow-[0_0_5px_#00dbe9]', iconColor: 'text-surface-tint' },
  { id: 3, name: 'Soul Flame', icon: 'local_fire_department', rarity: 'rare', color: 'border-[#4ade80]', dotColor: 'bg-[#4ade80]', iconColor: 'text-[#4ade80]' },
  { id: 4, name: 'Health Vial', icon: 'liquor', rarity: 'common', color: 'border-outline-variant opacity-70', dotColor: '', iconColor: 'text-on-surface-variant' },
  { id: 5, name: 'Plasma Lens', icon: 'lens', rarity: 'epic', color: 'border-surface-tint shadow-[inset_0_0_8px_rgba(0,219,233,0.1)]', dotColor: 'bg-surface-tint shadow-[0_0_5px_#00dbe9]', iconColor: 'text-surface-tint' },
  { id: 6, name: 'Nano Kit', icon: 'healing', rarity: 'common', color: 'border-outline-variant opacity-70', dotColor: '', iconColor: 'text-on-surface-variant' },
];

const recentActivity = [
  { id: 1, name: 'Plasma Emitter', icon: 'hardware', status: 'ACTIVE', statusColor: 'text-surface-tint', dot: 'bg-surface-tint shadow-[0_0_3px_#00dbe9]', amount: '450 DIA', time: 'LISTED 2H AGO' },
  { id: 2, name: 'Quantum Core', icon: 'memory', status: 'PENDING', statusColor: 'text-secondary', dot: 'bg-secondary shadow-[0_0_3px_#ecb2ff]', amount: '1,200 DIA', time: 'LISTED 1D AGO' },
  { id: 3, name: 'Void Shard x5', icon: 'diamond', status: 'SOLD', statusColor: 'text-outline', dot: 'bg-outline-variant', amount: '320 DIA', time: 'SETTLED 3D AGO' },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('inventory');

  return (
    <AppShell activeHref="/profile">
      <div className="max-w-3xl mx-auto flex flex-col gap-lg">
        {/* Profile Card */}
        <section className="glass-panel rounded-xl p-xl flex flex-col items-center text-center gap-md">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-surface-container-high border-2 border-surface-tint flex items-center justify-center shadow-[0_0_16px_rgba(0,219,233,0.3)]">
              <span className="material-symbols-outlined text-5xl text-surface-tint">person</span>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-surface-container-high border border-surface-tint rounded-full px-2 py-0.5 font-label-caps text-[10px] text-surface-tint flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-surface-tint shadow-[0_0_5px_#00dbe9]" />
              LVL 42
            </span>
          </div>
          <div>
            <h2 className="font-h2 text-h2 text-on-surface mb-1">Kaelthas_Prime</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base text-secondary">verified</span>
              Pro League Guild • Vanguard Rank
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-2">
            <div className="bg-surface-container-highest rounded-lg p-4 border border-outline-variant flex flex-col items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest">Total Earnings</span>
              <span className="font-mono-data text-h3 text-surface-tint flex items-center gap-1">
                <span className="material-symbols-outlined text-xl">diamond</span>
                14,250
              </span>
            </div>
            <div className="bg-surface-container-highest rounded-lg p-4 border border-outline-variant flex flex-col items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest">Success Rate</span>
              <span className="font-mono-data text-h3 text-on-surface">98.5%</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-surface-container-highest">
          {(['inventory', 'listings', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center gap-2 shrink-0 transition-colors ${
                tab === t
                  ? 'bg-surface-container border border-surface-tint text-surface-tint'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {t === 'inventory' ? 'inventory_2' : t === 'listings' ? 'list_alt' : 'history'}
              </span>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Inventory Tab */}
        {tab === 'inventory' && (
          <>
            <section className="flex flex-col gap-md">
              <div className="flex justify-between items-center">
                <h3 className="font-h3 text-h3 text-on-surface">Equipment</h3>
                <button className="text-surface-tint text-body-sm font-body-sm flex items-center gap-1">
                  Filter <span className="material-symbols-outlined text-base">filter_list</span>
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {inventoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-surface-container rounded-lg p-2 border ${item.color} flex flex-col items-center justify-center aspect-square relative hover:bg-surface-container-high transition-colors cursor-pointer group`}
                  >
                    {item.dotColor && (
                      <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${item.dotColor}`} />
                    )}
                    <span
                      className={`material-symbols-outlined text-4xl ${item.iconColor} mb-1`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {item.icon}
                    </span>
                    <span className="font-label-caps text-[9px] text-on-surface truncate w-full text-center">{item.name}</span>
                  </div>
                ))}
                <div className="bg-surface-container-lowest rounded-lg p-2 border border-dashed border-outline-variant flex items-center justify-center aspect-square opacity-50" />
                <div className="bg-surface-container-lowest rounded-lg p-2 border border-dashed border-outline-variant flex items-center justify-center aspect-square opacity-50" />
              </div>
            </section>

            <section className="flex flex-col gap-md">
              <h3 className="font-h3 text-h3 text-on-surface">Recent Activity</h3>
              <div className="glass-panel rounded-lg divide-y divide-outline-variant/50">
                {recentActivity.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface-container-highest border border-surface-tint flex items-center justify-center">
                        <span className="material-symbols-outlined text-surface-tint">{item.icon}</span>
                      </div>
                      <div>
                        <p className="font-body-md text-body-md text-on-surface font-medium">{item.name}</p>
                        <p className="font-label-caps text-[10px] text-on-surface-variant">{item.time}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono-data text-body-sm text-on-surface">{item.amount}</span>
                      <div className={`flex items-center gap-1 text-[10px] font-label-caps ${item.statusColor}`}>
                        {item.dot && <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />}
                        {item.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'listings' && (
          <div className="glass-panel rounded-xl p-xl text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-md">list_alt</span>
            <p className="text-on-surface-variant font-body-md text-body-md">View your active listings in the marketplace.</p>
            <Link href="/seller/listings" className="mt-md inline-flex bg-primary-container text-on-primary-container px-md py-sm rounded font-label-caps text-label-caps hover:opacity-90 transition-opacity">
              Go to My Listings
            </Link>
          </div>
        )}

        {tab === 'history' && (
          <div className="glass-panel rounded-xl p-xl text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-md">history</span>
            <p className="text-on-surface-variant font-body-md text-body-md">Your transaction history will appear here.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
