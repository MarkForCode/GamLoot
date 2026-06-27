'use client';

import { useState } from 'react';
import { AdminShell } from '../components/AdminShell';

type EventType = 'AUTH' | 'TRADE' | 'ADMIN' | 'SYSTEM' | 'SECURITY';

type LogEntry = {
  id: string;
  type: EventType;
  action: string;
  actor: string;
  target: string;
  ip: string;
  timestamp: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
};

const logs: LogEntry[] = [
  { id: 'LOG-8842', type: 'ADMIN', action: 'Guild Tier Upgrade', actor: 'admin@gam.io', target: 'Guild: Omega Legion', ip: '192.168.1.10', timestamp: '2025-06-14 10:44:22', outcome: 'SUCCESS' },
  { id: 'LOG-8841', type: 'TRADE', action: 'Auction Frozen', actor: 'system', target: 'Listing #TRD-088', ip: '10.0.0.1', timestamp: '2025-06-14 10:32:11', outcome: 'SUCCESS' },
  { id: 'LOG-8840', type: 'SECURITY', action: 'Failed Login Attempt', actor: 'unknown', target: 'admin@gam.io', ip: '203.0.113.42', timestamp: '2025-06-14 10:15:08', outcome: 'FAILURE' },
  { id: 'LOG-8839', type: 'AUTH', action: 'Admin Login', actor: 'ops@gam.io', target: 'CMS API', ip: '192.168.1.22', timestamp: '2025-06-14 09:58:44', outcome: 'SUCCESS' },
  { id: 'LOG-8838', type: 'SYSTEM', action: 'DB Migration Applied', actor: 'deploy-bot', target: 'gam_trade_dev', ip: '10.0.0.5', timestamp: '2025-06-14 09:30:00', outcome: 'SUCCESS' },
  { id: 'LOG-8837', type: 'ADMIN', action: 'User Role Changed', actor: 'admin@gam.io', target: 'user: GhostRaven', ip: '192.168.1.10', timestamp: '2025-06-13 22:14:33', outcome: 'SUCCESS' },
  { id: 'LOG-8836', type: 'TRADE', action: 'Distribution Approved', actor: 'finance@gam.io', target: 'TX-892A-44B', ip: '192.168.1.15', timestamp: '2025-06-13 20:01:55', outcome: 'SUCCESS' },
  { id: 'LOG-8835', type: 'SECURITY', action: 'Rate Limit Triggered', actor: '203.0.113.88', target: '/api/user/login', ip: '203.0.113.88', timestamp: '2025-06-13 18:44:02', outcome: 'WARNING' },
];

const typeMeta: Record<EventType, { color: string; dot: string }> = {
  AUTH: { color: 'text-primary-fixed-dim bg-cyan-500/10', dot: 'bg-primary-fixed-dim' },
  TRADE: { color: 'text-secondary bg-secondary/10', dot: 'bg-secondary' },
  ADMIN: { color: 'text-outline bg-surface-variant', dot: 'bg-outline' },
  SYSTEM: { color: 'text-on-surface-variant bg-surface-variant', dot: 'bg-on-surface-variant' },
  SECURITY: { color: 'text-error bg-error/10', dot: 'bg-error' },
};

const outcomeMeta: Record<LogEntry['outcome'], string> = {
  SUCCESS: 'text-primary-fixed-dim bg-cyan-500/10',
  FAILURE: 'text-error bg-error/10',
  WARNING: 'text-secondary bg-secondary/10',
};

const allTypes: Array<EventType | 'ALL'> = ['ALL', 'AUTH', 'TRADE', 'ADMIN', 'SYSTEM', 'SECURITY'];

export default function AuditLogPage() {
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = logs.filter((log) => {
    const matchesType = filter === 'ALL' || log.type === filter;
    const matchesSearch = !search || [log.action, log.actor, log.target, log.id].join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <AdminShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Audit Log</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Activity tracking and compliance audit trail.</p>
        </div>
        <button className="flex items-center gap-sm px-md py-sm border border-primary-fixed-dim text-primary-fixed-dim rounded hover:bg-primary-fixed-dim/10 transition-colors font-label-caps text-label-caps">
          <span className="material-symbols-outlined text-lg">download</span>
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-sm mb-lg items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            className="w-full bg-surface border border-outline-variant rounded pl-8 pr-md py-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors text-body-sm placeholder:text-outline"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-sm flex-wrap">
          {allTypes.map((t) => {
            const meta = t !== 'ALL' ? typeMeta[t] : null;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-md py-xs rounded font-label-caps text-label-caps transition-colors flex items-center gap-1 text-xs ${
                  filter === t
                    ? (meta ? `${meta.color} border border-current` : 'bg-surface-container border border-outline text-on-surface')
                    : 'border border-outline-variant text-on-surface-variant hover:border-outline'
                }`}
              >
                {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">manage_search</span>
            Event Log
          </h3>
          <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">{filtered.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest/50">
                {['Log ID', 'Type', 'Action', 'Actor', 'Target', 'IP', 'Timestamp', 'Outcome'].map((h) => (
                  <th key={h} className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors group">
                  <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs">{log.id}</td>
                  <td className="px-md py-sm">
                    <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 w-fit ${typeMeta[log.type].color}`}>
                      <span className={`w-1 h-1 rounded-full ${typeMeta[log.type].dot}`} />
                      {log.type}
                    </span>
                  </td>
                  <td className="px-md py-sm font-body-sm text-body-sm text-on-surface">{log.action}</td>
                  <td className="px-md py-sm font-mono-data text-mono-data text-primary-fixed-dim text-xs">{log.actor}</td>
                  <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">{log.target}</td>
                  <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs">{log.ip}</td>
                  <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-md py-sm">
                    <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase ${outcomeMeta[log.outcome]}`}>{log.outcome}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
