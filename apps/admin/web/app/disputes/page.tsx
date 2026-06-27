'use client';

import { useState } from 'react';
import { AdminShell } from '../components/AdminShell';

const cases = [
  { id: 'DSP-001', guild: 'Omega Legion', claimant: '@GhostRaven', respondent: '@Zephyr_X', item: 'Void Blade (Legendary)', amount: '3,200 CR', status: 'ESCALATED', opened: '2025-06-10', platform: 'StarForge Online' },
  { id: 'DSP-002', guild: 'Phoenix Corps', claimant: '@NovaSnipe', respondent: '@SteelHawk', item: 'Plasma Core T4', amount: '1,200 CR', status: 'OPEN', opened: '2025-06-08', platform: 'Void Realm' },
  { id: 'DSP-003', guild: 'Void Hunters', claimant: '@Viper_Actual', respondent: '@GhostRaven', item: 'Shield Blueprint', amount: '850 CR', status: 'RESOLVED', opened: '2025-06-01', platform: 'StarForge Online' },
  { id: 'DSP-004', guild: 'Nova Alliance', claimant: '@Zephyr_X', respondent: '@NovaStar', item: 'Quantum Drive (Rare)', amount: '3,400 CR', status: 'PENDING_REVIEW', opened: '2025-05-28', platform: 'Aether Chronicles' },
];

const statusMeta: Record<string, { color: string; dot: string; label: string }> = {
  ESCALATED: { color: 'text-error bg-error/10', dot: 'bg-error shadow-[0_0_4px_#ffb4ab]', label: 'Escalated' },
  OPEN: { color: 'text-secondary bg-secondary/10', dot: 'bg-secondary shadow-[0_0_4px_#ecb2ff]', label: 'Open' },
  PENDING_REVIEW: { color: 'text-primary-fixed-dim bg-cyan-500/10', dot: 'bg-primary-fixed-dim shadow-[0_0_4px_#00dbe9]', label: 'Pending Review' },
  RESOLVED: { color: 'text-outline bg-surface-variant', dot: 'bg-outline', label: 'Resolved' },
};

export default function AdminDisputesPage() {
  const [selected, setSelected] = useState<string | null>('DSP-001');
  const active = cases.find((c) => c.id === selected) ?? cases[0];

  return (
    <AdminShell>
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Dispute Appeal System</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Platform-level dispute arbitration and appeal resolution.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: 'Escalated', value: '1', color: 'text-error' },
          { label: 'Open', value: '1', color: 'text-secondary' },
          { label: 'Pending Review', value: '1', color: 'text-primary-fixed-dim' },
          { label: 'Resolved', value: '1', color: 'text-outline' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-md">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">{s.label}</p>
            <p className={`font-h2 text-h2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Case List */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-error">gavel</span>
              All Cases
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {cases.map((c) => {
              const meta = statusMeta[c.status];
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left p-md hover:bg-surface-variant/30 transition-colors ${selected === c.id ? 'bg-surface-variant/40 border-l-2 border-primary-fixed-dim' : ''}`}
                >
                  <div className="flex items-center justify-between mb-xs">
                    <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">{c.id}</span>
                    <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 ${meta.color}`}>
                      <span className={`w-1 h-1 rounded-full ${meta.dot}`} />{meta.label}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{c.item}</p>
                  <p className="font-mono-data text-mono-data text-primary-fixed-dim text-xs">{c.amount}</p>
                  <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mt-1">{c.guild}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <div className="glass-panel rounded-xl p-xl flex flex-col gap-md">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-sm mb-xs flex-wrap">
                  <span className="font-mono-data text-mono-data text-on-surface-variant text-sm">{active.id}</span>
                  <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 ${statusMeta[active.status].color}`}>
                    <span className={`w-1 h-1 rounded-full ${statusMeta[active.status].dot}`} />
                    {statusMeta[active.status].label}
                  </span>
                </div>
                <h2 className="font-h3 text-h3 text-on-surface">{active.item}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">{active.guild} • {active.platform}</p>
              </div>
              <span className="font-mono-data text-h3 text-primary-fixed-dim">{active.amount}</span>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <div className="bg-surface-container-high rounded-lg p-md">
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">Claimant</p>
                <p className="font-mono-data text-mono-data text-secondary">{active.claimant}</p>
              </div>
              <div className="bg-surface-container-high rounded-lg p-md">
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">Respondent</p>
                <p className="font-mono-data text-mono-data text-on-surface-variant">{active.respondent}</p>
              </div>
            </div>

            <div className="bg-surface-container-high rounded-lg p-md">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">Opened</p>
              <p className="font-mono-data text-mono-data text-on-surface">{active.opened}</p>
            </div>

            {/* Admin Actions */}
            <div className="border-t border-outline-variant pt-md flex gap-sm flex-wrap">
              {active.status !== 'RESOLVED' && (
                <>
                  <button className="px-md py-sm bg-primary-container text-on-primary-container rounded font-label-caps text-label-caps hover:opacity-90 transition-opacity flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Resolve — Favor Claimant
                  </button>
                  <button className="px-md py-sm border border-outline-variant text-on-surface-variant rounded font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">cancel</span>
                    Dismiss
                  </button>
                  <button className="px-md py-sm border border-error text-error rounded font-label-caps text-label-caps hover:bg-error/10 transition-colors flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">block</span>
                    Freeze Funds
                  </button>
                </>
              )}
              {active.status === 'RESOLVED' && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">Case closed. No further admin actions available.</p>
              )}
            </div>
          </div>

          {/* Evidence Submission */}
          <div className="glass-panel rounded-xl p-xl">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-md">Admin Notes & Evidence</h4>
            <textarea
              rows={4}
              className="w-full bg-surface border border-outline-variant rounded px-md py-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors resize-none placeholder:text-on-surface-variant/50 text-body-sm"
              placeholder="Add admin notes, evidence links, or resolution rationale..."
            />
            <div className="flex justify-end mt-md">
              <button className="px-md py-sm bg-surface-container border border-outline-variant text-on-surface-variant rounded font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center gap-sm">
                <span className="material-symbols-outlined text-lg">save</span>
                Save Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
