'use client';

import { AdminShell } from '../components/AdminShell';

const tenants = [
  { id: 'TNT-001', name: 'Omega Legion', plan: 'Pro', seats: '48/50', mrr: '$79', status: 'ACTIVE', renewal: '2025-07-01', overdue: false },
  { id: 'TNT-002', name: 'Phoenix Corps', plan: 'Pro', seats: '42/50', mrr: '$79', status: 'ACTIVE', renewal: '2025-07-05', overdue: false },
  { id: 'TNT-003', name: 'Void Hunters', plan: 'Enterprise', seats: '98/300', mrr: '$199', status: 'ACTIVE', renewal: '2025-07-10', overdue: false },
  { id: 'TNT-004', name: 'Nova Alliance', plan: 'Basic', seats: '18/20', mrr: '$29', status: 'PAST_DUE', renewal: '2025-06-01', overdue: true },
  { id: 'TNT-005', name: 'Iron Vanguard', plan: 'Trial', seats: '3/5', mrr: 'Free', status: 'TRIAL', renewal: '2025-06-28', overdue: false },
];

const statusMeta: Record<string, { color: string; dot: string }> = {
  ACTIVE: { color: 'text-primary-fixed-dim bg-cyan-500/10', dot: 'bg-primary-fixed-dim shadow-[0_0_4px_#00dbe9]' },
  PAST_DUE: { color: 'text-error bg-error/10', dot: 'bg-error shadow-[0_0_4px_#ffb4ab]' },
  TRIAL: { color: 'text-secondary bg-secondary/10', dot: 'bg-secondary shadow-[0_0_4px_#ecb2ff]' },
};

const planColors: Record<string, string> = {
  Enterprise: 'text-secondary',
  Pro: 'text-primary-fixed-dim',
  Basic: 'text-on-surface',
  Trial: 'text-on-surface-variant',
};

export default function BillingPage() {
  const totalMRR = tenants.reduce((sum, t) => sum + (t.mrr === 'Free' ? 0 : parseInt(t.mrr.replace('$', ''), 10)), 0);

  return (
    <AdminShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Subscription Billing</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Manage tenant subscriptions, billing status, and invoices.</p>
        </div>
        <button className="flex items-center gap-sm px-md py-sm border border-primary-fixed-dim text-primary-fixed-dim rounded hover:bg-primary-fixed-dim/10 transition-colors font-label-caps text-label-caps">
          <span className="material-symbols-outlined text-lg">download</span>
          Export Billing Report
        </button>
      </div>

      {/* MRR Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: 'Total MRR', value: `$${totalMRR}`, color: 'text-primary-fixed-dim' },
          { label: 'Active Tenants', value: String(tenants.filter((t) => t.status === 'ACTIVE').length), color: 'text-on-surface' },
          { label: 'Past Due', value: String(tenants.filter((t) => t.overdue).length), color: 'text-error' },
          { label: 'Trial Accounts', value: String(tenants.filter((t) => t.status === 'TRIAL').length), color: 'text-secondary' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-md">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">{s.label}</p>
            <p className={`font-h2 text-h2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-lg">
        {['Trial', 'Basic', 'Pro', 'Enterprise'].map((plan) => {
          const count = tenants.filter((t) => t.plan === plan).length;
          const pct = Math.round((count / tenants.length) * 100);
          return (
            <div key={plan} className="glass-panel rounded-xl p-md flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <span className={`font-label-caps text-label-caps uppercase tracking-widest ${planColors[plan]}`}>{plan}</span>
                <span className="font-mono-data text-mono-data text-on-surface">{count}</span>
              </div>
              <div className="w-full bg-surface-dim h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${plan === 'Enterprise' ? 'bg-secondary' : plan === 'Pro' ? 'bg-primary-fixed-dim' : plan === 'Basic' ? 'bg-on-surface' : 'bg-on-surface-variant'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="font-label-caps text-[10px] text-on-surface-variant">{pct}% of tenants</span>
            </div>
          );
        })}
      </div>

      {/* Tenant Billing Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">receipt_long</span>
            Tenant Subscriptions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest/50">
                {['Tenant', 'Plan', 'Seats', 'MRR', 'Renewal', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const meta = statusMeta[t.status];
                return (
                  <tr key={t.id} className={`border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors group ${t.overdue ? 'bg-error/5' : ''}`}>
                    <td className="px-md py-sm">
                      <p className="font-body-sm text-body-sm text-on-surface font-semibold">{t.name}</p>
                      <p className="font-mono-data text-mono-data text-on-surface-variant text-xs">{t.id}</p>
                    </td>
                    <td className="px-md py-sm">
                      <span className={`font-label-caps text-label-caps uppercase font-bold ${planColors[t.plan]}`}>{t.plan}</span>
                    </td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant">{t.seats}</td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-primary-fixed-dim">{t.mrr}</td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs">
                      <span className={t.overdue ? 'text-error' : ''}>{t.renewal}</span>
                    </td>
                    <td className="px-md py-sm">
                      <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 w-fit ${meta.color}`}>
                        <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex gap-sm opacity-50 group-hover:opacity-100 transition-opacity">
                        <button className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors" title="View Invoices">
                          <span className="material-symbols-outlined text-lg">receipt</span>
                        </button>
                        {t.overdue && (
                          <button className="text-error hover:text-error/80 transition-colors" title="Send Payment Reminder">
                            <span className="material-symbols-outlined text-lg">mail</span>
                          </button>
                        )}
                        <button className="text-on-surface-variant hover:text-secondary transition-colors" title="Upgrade Plan">
                          <span className="material-symbols-outlined text-lg">upgrade</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
