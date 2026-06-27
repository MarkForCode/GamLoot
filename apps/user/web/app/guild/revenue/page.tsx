'use client';

import { AppShell } from '../../components/AppShell';

const distributions = [
  { id: 'TX-892A-44B', source: 'Alpha Sector Mining', icon: 'token', iconColor: 'text-primary-fixed-dim', amount: '$45,000', guildPct: 60, memberPct: 40 },
  { id: 'TX-119X-99Z', source: 'Raid Loot Sale: Omega', icon: 'swords', iconColor: 'text-secondary', amount: '$12,500', guildPct: 80, memberPct: 20 },
  { id: 'TX-441C-12D', source: 'Marketplace Tax Pool', icon: 'storefront', iconColor: 'text-primary-fixed-dim', amount: '$8,200', guildPct: 50, memberPct: 50 },
];

const history = [
  { id: 'TX-778B-55E', desc: 'Q2 Mining Revenue', amount: '$32,100', status: 'Distributed', date: '2025-06-01', statusColor: 'text-primary-fixed-dim bg-cyan-500/10' },
  { id: 'TX-663A-88F', desc: 'Arena Loot Pool', amount: '$9,800', status: 'Distributed', date: '2025-05-28', statusColor: 'text-primary-fixed-dim bg-cyan-500/10' },
  { id: 'TX-221D-34G', desc: 'Crafting Workshop Sales', amount: '$5,400', status: 'Rejected', date: '2025-05-20', statusColor: 'text-error bg-error/10' },
];

export default function RevenueSharePage() {
  return (
    <AppShell activeHref="/guild/revenue">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-background text-glow-primary">Treasury & Revenue Share</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Guild financial overview and distribution management.</p>
        </div>
        <button className="bg-surface-container border border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed/10 font-body-sm text-body-sm px-md py-sm rounded transition-colors flex items-center gap-2 w-fit">
          <span className="material-symbols-outlined text-lg">download</span>
          Export Financial Report
        </button>
      </div>

      {/* Stats Bento */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: 'Total Treasury Balance', value: '$2.45M', trend: '+12.4% vs last month', trendColor: 'text-primary-fixed', icon: 'account_balance', glow: 'bg-primary-fixed/5' },
          { label: 'Monthly Revenue', value: '$428K', trend: '+5.2% vs last month', trendColor: 'text-secondary', icon: 'trending_up', glow: 'bg-secondary/5' },
          { label: 'Pending Distributions', value: '14', trend: 'Requires leadership approval', trendColor: 'text-on-surface-variant', icon: 'pending', glow: 'bg-error/5' },
          { label: 'Growth Rate', value: '8.7%', trend: 'Stable trajectory', trendColor: 'text-primary-fixed', icon: 'arrow_drop_up', glow: 'bg-primary-fixed-dim/5' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-2 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${stat.glow} rounded-full blur-xl`} />
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{stat.label}</span>
            <div className="font-mono-data text-[32px] text-on-background mt-1">{stat.value}</div>
            <div className={`flex items-center gap-1 ${stat.trendColor} font-body-sm text-body-sm mt-auto`}>
              <span className="material-symbols-outlined text-base">{stat.icon}</span>
              {stat.trend}
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Pending Distributions Table */}
        <section className="lg:col-span-2 bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-high/50">
            <h2 className="font-h3 text-h3 text-on-background">Pending Distributions</h2>
            <span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-container shadow-[0_0_4px_#00f0ff]" />
              Action Req
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/50 bg-surface-container-lowest/50">
                  <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Source Trade</th>
                  <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Total</th>
                  <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Breakdown</th>
                  <th className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id} className="border-b border-outline-variant/30 hover:bg-surface-container-highest/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-surface-bright flex items-center justify-center border border-outline-variant/50">
                          <span className={`material-symbols-outlined ${d.iconColor}`}>{d.icon}</span>
                        </div>
                        <div>
                          <div className="font-body-sm text-body-sm font-semibold text-on-surface">{d.source}</div>
                          <div className="font-mono-data text-xs text-on-surface-variant">{d.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono-data text-mono-data text-right text-on-surface">{d.amount}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-surface-dim h-1.5 rounded-full overflow-hidden flex mb-1">
                        <div className="bg-primary-fixed h-full" style={{ width: `${d.guildPct}%` }} />
                        <div className="bg-secondary h-full" style={{ width: `${d.memberPct}%` }} />
                      </div>
                      <div className="flex justify-between font-label-caps text-[10px] text-on-surface-variant">
                        <span>Guild: {d.guildPct}%</span>
                        <span>Members: {d.memberPct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary-fixed hover:bg-primary-fixed/10 p-2 rounded transition-colors" title="Approve">
                        <span className="material-symbols-outlined">check_circle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Distribution History */}
        <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-outline-variant bg-surface-container-high/50">
            <h2 className="font-h3 text-h3 text-on-background">Settlement History</h2>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {history.map((h) => (
              <div key={h.id} className="p-md hover:bg-surface-variant/20 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold">{h.desc}</span>
                  <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase ${h.statusColor}`}>{h.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">{h.id}</span>
                  <span className="font-mono-data text-mono-data text-primary-fixed-dim text-sm">{h.amount}</span>
                </div>
                <div className="font-label-caps text-[10px] text-on-surface-variant mt-1 uppercase">{h.date}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
