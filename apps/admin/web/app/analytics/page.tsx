'use client';

import { AdminShell } from '../components/AdminShell';

const kpis = [
  { label: 'Total Platform Revenue', value: '$4.2M', trend: '+18.3%', icon: 'paid', color: 'text-primary-fixed-dim', glow: 'bg-primary-fixed-dim/5' },
  { label: 'Active Guilds', value: '342', trend: '+5 this week', icon: 'shield', color: 'text-secondary', glow: 'bg-secondary/5' },
  { label: 'Total Transactions', value: '18,429', trend: '+12.1%', icon: 'receipt_long', color: 'text-primary-fixed-dim', glow: 'bg-primary-fixed-dim/5' },
  { label: 'Platform Uptime', value: '99.98%', trend: 'Last 30 days', icon: 'cloud_done', color: 'text-outline', glow: 'bg-outline/5' },
];

const topGuilds = [
  { rank: 1, name: 'Omega Legion', members: 48, revenue: '$128,400', activity: 98 },
  { rank: 2, name: 'Phoenix Corps', members: 42, revenue: '$94,200', activity: 92 },
  { rank: 3, name: 'Void Hunters', members: 50, revenue: '$87,600', activity: 88 },
  { rank: 4, name: 'Nova Alliance', members: 35, revenue: '$72,100', activity: 81 },
  { rank: 5, name: 'Iron Vanguard', members: 30, revenue: '$61,800', activity: 76 },
];

const revenueByGame = [
  { game: 'StarForge Online', pct: 38, color: 'bg-primary-fixed-dim', revenue: '$1.59M' },
  { game: 'Void Realm', pct: 27, color: 'bg-secondary', revenue: '$1.13M' },
  { game: 'Aether Chronicles', pct: 21, color: 'bg-primary-container', revenue: '$882K' },
  { game: 'Iron Dominion', pct: 14, color: 'bg-outline', revenue: '$588K' },
];

export default function AnalyticsPage() {
  return (
    <AdminShell>
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Advanced Analytics</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Platform-wide business intelligence and reporting.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-2 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${k.glow} rounded-full blur-xl`} />
            <div className="flex justify-between items-start">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">{k.label}</span>
              <span className={`material-symbols-outlined text-xl ${k.color}`}>{k.icon}</span>
            </div>
            <div className="font-mono-data text-[32px] text-on-background">{k.value}</div>
            <div className={`font-body-sm text-body-sm mt-auto ${k.color}`}>{k.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        {/* Revenue by Game */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">pie_chart</span>
              Revenue by Game
            </h3>
          </div>
          <div className="p-lg flex flex-col gap-md">
            {revenueByGame.map((g) => (
              <div key={g.game}>
                <div className="flex justify-between mb-xs">
                  <span className="font-body-sm text-body-sm text-on-surface">{g.game}</span>
                  <span className="font-mono-data text-mono-data text-on-surface-variant text-sm">{g.revenue}</span>
                </div>
                <div className="w-full bg-surface-dim h-2 rounded-full overflow-hidden">
                  <div className={`${g.color} h-full rounded-full transition-all`} style={{ width: `${g.pct}%` }} />
                </div>
                <div className="font-label-caps text-[10px] text-on-surface-variant mt-xs">{g.pct}% of total</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Guilds Table — 2 cols */}
        <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim">emoji_events</span>
              Top Performing Guilds
            </h3>
            <button className="text-primary-fixed-dim font-label-caps text-label-caps hover:text-primary transition-colors uppercase tracking-widest text-xs">
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest/50">
                  {['Rank', 'Guild', 'Members', 'Revenue', 'Activity'].map((h) => (
                    <th key={h} className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topGuilds.map((g) => (
                  <tr key={g.rank} className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors">
                    <td className="px-md py-sm">
                      <span className={`font-mono-data text-mono-data font-bold ${g.rank === 1 ? 'text-secondary' : g.rank <= 3 ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
                        #{g.rank}
                      </span>
                    </td>
                    <td className="px-md py-sm font-body-sm text-body-sm text-on-surface font-medium">{g.name}</td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant">{g.members}</td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-primary-fixed-dim">{g.revenue}</td>
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-sm">
                        <div className="w-20 bg-surface-dim h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary-fixed-dim h-full rounded-full" style={{ width: `${g.activity}%` }} />
                        </div>
                        <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">{g.activity}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart (simplified bar representation) */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">bar_chart</span>
            Monthly Revenue Trend (2025)
          </h3>
        </div>
        <div className="p-lg">
          <div className="flex items-end gap-2 h-40">
            {[
              { month: 'Jan', value: 320 },
              { month: 'Feb', value: 360 },
              { month: 'Mar', value: 310 },
              { month: 'Apr', value: 420 },
              { month: 'May', value: 390 },
              { month: 'Jun', value: 428 },
            ].map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-xs">
                <span className="font-mono-data text-mono-data text-primary-fixed-dim text-xs">${d.value}K</span>
                <div
                  className="w-full bg-primary-fixed-dim/20 border border-primary-fixed-dim/30 rounded-t hover:bg-primary-fixed-dim/30 transition-colors"
                  style={{ height: `${(d.value / 430) * 100}%` }}
                />
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">{d.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
