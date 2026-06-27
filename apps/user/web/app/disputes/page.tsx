'use client';

import { useState } from 'react';
import { AppShell } from '../components/AppShell';

type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'APPEALED';

const disputes = [
  { id: 'DSP-001', trade: 'TRD-088', item: 'Void Blade (Legendary)', amount: '3,200 CR', claimant: '@GhostRaven', respondent: '@Zephyr_X', status: 'OPEN' as DisputeStatus, opened: '2025-06-10', reason: 'Item not delivered after payment confirmed.' },
  { id: 'DSP-002', trade: 'TRD-074', item: 'Plasma Core T4', amount: '1,200 CR', claimant: '@NovaSnipe', respondent: '@SteelHawk', status: 'UNDER_REVIEW' as DisputeStatus, opened: '2025-06-08', reason: 'Item condition different from listing description.' },
  { id: 'DSP-003', trade: 'TRD-061', item: 'Shield Blueprint', amount: '850 CR', claimant: '@Viper_Actual', respondent: '@GhostRaven', status: 'RESOLVED' as DisputeStatus, opened: '2025-06-01', reason: 'Funds released after evidence review.' },
  { id: 'DSP-004', trade: 'TRD-042', item: 'Quantum Drive (Rare)', amount: '3,400 CR', claimant: '@Zephyr_X', respondent: '@NovaStar', status: 'APPEALED' as DisputeStatus, opened: '2025-05-28', reason: 'Original resolution appealed — escalated to officer panel.' },
];

const statusMeta: Record<DisputeStatus, { label: string; color: string; dot: string }> = {
  OPEN: { label: 'Open', color: 'text-error bg-error/10', dot: 'bg-error shadow-[0_0_4px_#ffb4ab]' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-secondary bg-secondary/10', dot: 'bg-secondary shadow-[0_0_4px_#ecb2ff]' },
  RESOLVED: { label: 'Resolved', color: 'text-outline bg-surface-variant', dot: 'bg-outline-variant' },
  APPEALED: { label: 'Appealed', color: 'text-primary-fixed-dim bg-cyan-500/10', dot: 'bg-primary-fixed-dim shadow-[0_0_4px_#00dbe9]' },
};

export default function DisputesPage() {
  const [selected, setSelected] = useState<string | null>('DSP-001');
  const active = disputes.find((d) => d.id === selected) ?? disputes[0];

  return (
    <AppShell activeHref="/disputes">
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Dispute Resolution</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Review, respond to, and appeal trade disputes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Dispute List */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-error">gavel</span>
              Cases
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {disputes.map((d) => {
              const meta = statusMeta[d.status];
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  className={`w-full text-left p-md hover:bg-surface-variant/30 transition-colors ${selected === d.id ? 'bg-surface-variant/40 border-l-2 border-primary-fixed-dim' : ''}`}
                >
                  <div className="flex items-center justify-between mb-xs">
                    <span className="font-mono-data text-mono-data text-on-surface-variant text-xs">{d.id}</span>
                    <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 ${meta.color}`}>
                      <span className={`w-1 h-1 rounded-full ${meta.dot}`} />{meta.label}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{d.item}</p>
                  <p className="font-mono-data text-mono-data text-primary-fixed-dim text-xs">{d.amount}</p>
                  <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mt-1">{d.opened}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <div className="glass-panel rounded-xl p-xl flex flex-col gap-md">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-sm mb-xs">
                  <span className="font-mono-data text-mono-data text-on-surface-variant text-sm">{active.id}</span>
                  <span className="font-mono-data text-mono-data text-on-surface-variant text-sm">•</span>
                  <span className="font-mono-data text-mono-data text-on-surface-variant text-sm">{active.trade}</span>
                  <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 ${statusMeta[active.status].color}`}>
                    <span className={`w-1 h-1 rounded-full ${statusMeta[active.status].dot}`} />
                    {statusMeta[active.status].label}
                  </span>
                </div>
                <h2 className="font-h3 text-h3 text-on-surface">{active.item}</h2>
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
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">Reason</p>
              <p className="font-body-md text-body-md text-on-surface">{active.reason}</p>
            </div>

            <div className="border-t border-outline-variant pt-md flex gap-sm flex-wrap">
              {active.status === 'OPEN' && (
                <>
                  <button className="px-md py-sm bg-primary-container text-on-primary-container rounded font-label-caps text-label-caps hover:opacity-90 transition-opacity flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">rate_review</span>
                    Open Review
                  </button>
                  <button className="px-md py-sm border border-outline-variant text-on-surface-variant rounded font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                    Submit Evidence
                  </button>
                </>
              )}
              {active.status === 'UNDER_REVIEW' && (
                <>
                  <button className="px-md py-sm bg-primary-container text-on-primary-container rounded font-label-caps text-label-caps hover:opacity-90 transition-opacity flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Resolve in Favor of Claimant
                  </button>
                  <button className="px-md py-sm border border-error text-error rounded font-label-caps text-label-caps hover:bg-error/10 transition-colors flex items-center gap-sm">
                    <span className="material-symbols-outlined text-lg">cancel</span>
                    Dismiss Dispute
                  </button>
                </>
              )}
              {active.status === 'RESOLVED' && (
                <button className="px-md py-sm border border-secondary text-secondary rounded font-label-caps text-label-caps hover:bg-secondary/10 transition-colors flex items-center gap-sm">
                  <span className="material-symbols-outlined text-lg">policy</span>
                  File Appeal
                </button>
              )}
              {active.status === 'APPEALED' && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">Case is under officer panel review. No further actions available.</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-panel rounded-xl p-xl">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-md">Case Timeline</h4>
            <div className="flex flex-col gap-md">
              {[
                { icon: 'flag', color: 'text-error', label: 'Dispute Filed', desc: `${active.claimant} opened this dispute.`, time: active.opened },
                { icon: 'lock', color: 'text-secondary', label: 'Funds Frozen', desc: `${active.amount} escrowed pending resolution.`, time: active.opened },
                active.status !== 'OPEN' && { icon: 'rate_review', color: 'text-primary-fixed-dim', label: 'Review Started', desc: 'Officer assigned to review evidence.', time: '2025-06-11' },
                active.status === 'RESOLVED' && { icon: 'check_circle', color: 'text-primary-container', label: 'Case Resolved', desc: 'Funds released.', time: '2025-06-13' },
                active.status === 'APPEALED' && { icon: 'policy', color: 'text-secondary', label: 'Appeal Filed', desc: 'Escalated to officer panel.', time: '2025-06-12' },
              ].filter((s): s is { icon: string; color: string; label: string; desc: string; time: string } => Boolean(s)).map((step, i) => (
                <div key={i} className="flex gap-md items-start">
                  <div className={`w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 ${step.color}`}>
                    <span className="material-symbols-outlined text-base">{step.icon}</span>
                  </div>
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface font-semibold">{step.label}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{step.desc}</p>
                    <p className="font-mono-data text-mono-data text-outline text-xs mt-xs">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
