'use client';

import Link from 'next/link';
import { AppShell } from '../../components/AppShell';

const announcements = [
  {
    id: 1,
    title: 'Q3 Strategic Realignment',
    body: 'All squadron leaders are required to submit their updated roster formats by end of cycle. Focus shifts to resource acquisition in Sector 7.',
    tag: 'URGENT',
    read: true,
    time: '2h ago',
    dot: 'bg-primary-container',
    glow: true,
  },
  {
    id: 2,
    title: 'Marketplace Tax Adjustment',
    body: 'The guild transaction tax has been reduced to 2.5% for all internal trades to stimulate localized economic activity.',
    tag: 'ECONOMY',
    read: false,
    time: '1d ago',
    dot: 'bg-outline-variant',
    glow: false,
  },
  {
    id: 3,
    title: 'New Alliance Formed',
    body: 'We have formed a strategic alliance with Phantom Corps and Eclipse Division. Expect joint operations to begin next cycle.',
    tag: 'ALLIANCE',
    read: false,
    time: '2d ago',
    dot: 'bg-secondary-container',
    glow: false,
  },
];

const marketFeed = [
  { type: 'NEW BID', typeColor: 'text-secondary-fixed-dim', item: 'Plasma Core T4', price: '1,200 CR', priceColor: 'text-primary-fixed-dim', time: 'Just now' },
  { type: 'LISTED', typeColor: 'text-outline', item: 'Aegis Shield BP', price: '850 CR', priceColor: 'text-on-surface-variant', time: '5m ago' },
  { type: 'SOLD', typeColor: 'text-primary-fixed', item: 'Quantum Drive', price: '3,400 CR', priceColor: 'text-outline', time: '12m ago' },
  { type: 'NEW BID', typeColor: 'text-secondary-fixed-dim', item: 'Void Lens Array', price: '2,100 CR', priceColor: 'text-primary-fixed-dim', time: '18m ago' },
  { type: 'LISTED', typeColor: 'text-outline', item: 'Nano-Repair Kit x10', price: '320 CR', priceColor: 'text-on-surface-variant', time: '25m ago' },
];

const recentTrades = [
  { id: 'TRD-001', item: 'Plasma Core T4', buyer: 'Zephyr_X', amount: '1,200 CR', status: 'Active', statusColor: 'text-primary-fixed-dim bg-cyan-500/10' },
  { id: 'TRD-002', item: 'Aegis Shield Blueprint', buyer: 'NovaStar', amount: '850 CR', status: 'Pending', statusColor: 'text-secondary bg-secondary/10' },
  { id: 'TRD-003', item: 'Quantum Drive (Rare)', buyer: 'GhostRaven', amount: '3,400 CR', status: 'Settled', statusColor: 'text-outline bg-surface-variant' },
];

export default function GuildDashboard() {
  return (
    <AppShell activeHref="/guild/dashboard">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md mb-lg">
        <div>
          <h2 className="font-h2 text-h2 text-on-surface mb-xs tracking-tight text-glow-primary">Command Center</h2>
          <p className="text-on-surface-variant font-body-sm text-body-sm">Overview of guild operations and market activity.</p>
        </div>
        <div className="text-right">
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-unit uppercase tracking-widest">Current Cycle</p>
          <p className="font-mono-data text-mono-data text-primary-fixed-dim">CYC-904.A2</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
        <StatCard icon="account_balance" label="Treasury Balance" value="24,590" unit="CR" sub="+12.5% this cycle" />
        <StatCard icon="sync_alt" label="Active Trades" value="142" sub="24 awaiting approval" />
        <StatCard icon="person_add" label="New Members" value="18" sub="Pending review" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-lg">
        {/* Announcements — 2 cols */}
        <div className="lg:col-span-2 glass-panel rounded-xl flex flex-col overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim">campaign</span>
              Guild Announcements
            </h3>
            <Link href="/guild/bulletin" className="text-primary-fixed-dim font-label-caps text-label-caps hover:text-primary transition-colors uppercase tracking-widest">
              VIEW ALL
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-96">
            {announcements.map((a) => (
              <div key={a.id} className="p-md border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors flex gap-md items-start">
                <div className={`w-2 h-2 rounded-full ${a.dot} mt-2 shrink-0 ${a.glow ? "shadow-[0_0_8px_#00f0ff]" : ""}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-xs">
                    <h4 className="font-body-lg text-body-lg text-on-surface font-semibold">{a.title}</h4>
                    <span className="font-mono-data text-mono-data text-outline text-xs ml-4 shrink-0">{a.time}</span>
                  </div>
                  <p className="text-on-surface-variant font-body-sm text-body-sm mb-sm line-clamp-2">{a.body}</p>
                  <div className="flex items-center gap-sm">
                    <span className="bg-surface-bright px-2 py-1 rounded font-label-caps text-[10px] text-on-surface-variant border border-outline-variant uppercase">{a.tag}</span>
                    {a.read && (
                      <span className="text-primary-fixed-dim font-label-caps text-[10px] flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm">done_all</span> READ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Feed */}
        <div className="glass-panel rounded-xl flex flex-col overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary-fixed">monitoring</span>
              Market Feed
            </h3>
          </div>
          <ul className="divide-y divide-outline-variant/50 flex-1 overflow-y-auto max-h-96">
            {marketFeed.map((item, i) => (
              <li key={i} className="p-md hover:bg-surface-variant/30 transition-colors">
                <div className="flex justify-between items-center mb-xs">
                  <span className={`font-label-caps text-label-caps ${item.typeColor} uppercase tracking-widest text-[10px]`}>{item.type}</span>
                  <span className="font-mono-data text-mono-data text-outline text-xs">{item.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface font-body-md text-body-md">{item.item}</span>
                  <span className={`font-mono-data text-mono-data ${item.priceColor}`}>{item.price}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="p-md border-t border-outline-variant">
            <Link href="/market" className="w-full py-2 px-4 border border-outline-variant text-primary-fixed-dim rounded hover:bg-surface-variant transition-colors flex items-center justify-center gap-sm text-body-sm">
              Open Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Trades Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary">receipt_long</span>
            Recent Trades
          </h3>
          <Link href="/market" className="text-primary-fixed-dim font-label-caps text-label-caps hover:text-primary transition-colors uppercase tracking-widest">
            VIEW ALL
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-left p-md font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Trade ID</th>
                <th className="text-left p-md font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Item</th>
                <th className="text-left p-md font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Buyer</th>
                <th className="text-right p-md font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Amount</th>
                <th className="text-right p-md font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors">
                  <td className="p-md font-mono-data text-mono-data text-on-surface-variant">{trade.id}</td>
                  <td className="p-md text-on-surface font-body-sm text-body-sm">{trade.item}</td>
                  <td className="p-md text-on-surface-variant font-body-sm text-body-sm">{trade.buyer}</td>
                  <td className="p-md text-right font-mono-data text-mono-data text-primary-fixed-dim">{trade.amount}</td>
                  <td className="p-md text-right">
                    <span className={`px-2 py-1 rounded font-label-caps text-[10px] uppercase ${trade.statusColor}`}>{trade.status}</span>
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

function StatCard({ icon, label, value, unit, sub }: { icon: string; label: string; value: string; unit?: string; sub: string }) {
  return (
    <div className="glass-panel p-lg rounded-xl flex flex-col justify-between hover:bg-surface-variant transition-colors group">
      <div className="flex justify-between items-start mb-md">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">{label}</span>
        <span className="material-symbols-outlined text-outline group-hover:text-primary-fixed-dim transition-colors">{icon}</span>
      </div>
      <div>
        <div className="font-h1 text-h1 text-on-surface">
          {value} {unit && <span className="text-primary-container text-h3">{unit}</span>}
        </div>
        <p className="text-outline font-body-sm text-body-sm mt-xs">{sub}</p>
      </div>
    </div>
  );
}
