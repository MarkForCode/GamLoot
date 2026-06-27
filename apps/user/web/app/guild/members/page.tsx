'use client';

import { useState } from 'react';
import { AppShell } from '../../components/AppShell';

const members = [
  { id: '884-291', name: 'Viper_Actual', role: 'LEADER', roleColor: 'border-primary-container/30 bg-primary-container/10 text-primary-fixed', roleIcon: 'stars', joined: '2023.10.14', status: 'ONLINE', statusColor: 'text-surface-tint', dot: 'bg-surface-tint shadow-[0_0_6px_#00dbe9]' },
  { id: '441-822', name: 'NovaSnipe', role: 'DEPUTY', roleColor: 'border-secondary/30 bg-secondary/10 text-secondary', roleIcon: 'military_tech', joined: '2024.01.22', status: 'ONLINE', statusColor: 'text-surface-tint', dot: 'bg-surface-tint shadow-[0_0_6px_#00dbe9]' },
  { id: '772-411', name: 'GhostRaven', role: 'BUYER', roleColor: 'border-outline-variant bg-surface-variant/30 text-on-surface-variant', roleIcon: 'shopping_cart', joined: '2024.03.05', status: 'AWAY', statusColor: 'text-secondary', dot: 'bg-secondary shadow-[0_0_6px_#ecb2ff]' },
  { id: '993-104', name: 'Zephyr_X', role: 'MEMBER', roleColor: 'border-outline-variant bg-surface-variant/30 text-on-surface-variant', roleIcon: 'person', joined: '2024.05.17', status: 'OFFLINE', statusColor: 'text-outline', dot: 'bg-outline' },
  { id: '551-287', name: 'SteelHawk', role: 'FINANCE', roleColor: 'border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim', roleIcon: 'account_balance', joined: '2024.02.10', status: 'ONLINE', statusColor: 'text-surface-tint', dot: 'bg-surface-tint shadow-[0_0_6px_#00dbe9]' },
];

export default function MembersPage() {
  const [search, setSearch] = useState('');

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell activeHref="/guild/members">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Roster Management</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Oversee guild members, assign roles, and monitor status.</p>
        </div>
        <button className="flex items-center gap-sm px-md py-sm bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <span className="material-symbols-outlined text-lg">mail</span>
          Invite via Email
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
        <div className="bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-base">military_tech</span>
              Current Tier
            </span>
            <span className="px-unit py-xs bg-secondary-container/20 text-secondary-container border border-secondary-container/30 rounded font-label-caps text-[10px] tracking-widest">PRO PLAN</span>
          </div>
          <div className="flex items-baseline gap-xs">
            <span className="font-h2 text-h2 text-on-surface">42</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">/ 50 Members</span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-md overflow-hidden">
            <div className="bg-primary-container h-full rounded-full shadow-[0_0_8px_#00f0ff]" style={{ width: '84%' }} />
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-xs mb-sm">
            <span className="material-symbols-outlined text-base">monitoring</span>
            Weekly Activity
          </span>
          <div className="flex items-baseline gap-xs">
            <span className="font-h2 text-h2 text-on-surface">89%</span>
            <span className="font-body-sm text-body-sm text-surface-tint flex items-center">
              <span className="material-symbols-outlined text-sm">arrow_upward</span> 2.4%
            </span>
          </div>
          <div className="font-body-sm text-body-sm text-on-surface-variant mt-sm">Guild participation rate</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-base">pending_actions</span>
              Pending Requests
            </span>
            <span className="w-2 h-2 rounded-full bg-error shadow-[0_0_6px_#ffb4ab]" />
          </div>
          <span className="font-h2 text-h2 text-on-surface">3</span>
          <div className="font-body-sm text-body-sm text-on-surface-variant mt-sm">Awaiting officer approval</div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
        <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-high/50">
          <h3 className="font-h3 text-on-surface text-lg">Active Personnel</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              className="bg-surface border border-outline-variant rounded text-body-sm font-body-sm text-on-surface pl-8 pr-md py-unit focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container w-48 md:w-64 placeholder:text-outline transition-all"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-highest/30 border-b border-outline-variant">
                {['Operative', 'Designation', 'Induction Date', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={`py-sm px-md font-label-caps text-label-caps text-on-surface-variant uppercase ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high/40 transition-colors group">
                  <td className="py-sm px-md">
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded border border-outline-variant bg-surface-container-high flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant">person</span>
                      </div>
                      <div>
                        <span className="text-on-surface font-semibold group-hover:text-primary-container transition-colors block">{m.name}</span>
                        <span className="text-on-surface-variant text-xs">ID: {m.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-sm px-md">
                    <span className={`inline-flex items-center px-sm py-unit border rounded font-label-caps text-[10px] tracking-widest ${m.roleColor}`}>
                      <span className="material-symbols-outlined text-xs mr-unit">{m.roleIcon}</span>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-sm px-md font-mono-data text-mono-data text-on-surface-variant">{m.joined}</td>
                  <td className="py-sm px-md">
                    <span className={`flex items-center gap-xs font-label-caps text-[11px] ${m.statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      {m.status}
                    </span>
                  </td>
                  <td className="py-sm px-md text-right">
                    <div className="flex items-center justify-end gap-sm opacity-50 group-hover:opacity-100 transition-opacity">
                      <button className="p-unit text-on-surface-variant hover:text-primary-container transition-colors rounded hover:bg-surface-container-highest" title="Edit Role">
                        <span className="material-symbols-outlined text-lg">manage_accounts</span>
                      </button>
                      <button className="p-unit text-on-surface-variant hover:text-error transition-colors rounded hover:bg-surface-container-highest" title="Remove">
                        <span className="material-symbols-outlined text-lg">person_remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
