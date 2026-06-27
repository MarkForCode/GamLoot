'use client';

import { useState } from 'react';
import { AppShell } from '../../components/AppShell';

const requests = [
  { id: 'REQ-001', item: 'Nano-Repair Kit x50', requestedBy: '@SteelHawk', qty: 50, status: 'OPEN', priority: 'HIGH', deadline: '2025-06-20', quotes: 2 },
  { id: 'REQ-002', item: 'Plasma Cell Array', requestedBy: '@NovaSnipe', qty: 10, status: 'QUOTED', priority: 'MED', deadline: '2025-06-25', quotes: 3 },
  { id: 'REQ-003', item: 'Shield Emitter Core', requestedBy: '@Zephyr_X', qty: 5, status: 'FULFILLED', priority: 'LOW', deadline: '2025-06-15', quotes: 1 },
  { id: 'REQ-004', item: 'Void Shard x200', requestedBy: '@GhostRaven', qty: 200, status: 'OPEN', priority: 'HIGH', deadline: '2025-06-18', quotes: 0 },
];

const statusColors: Record<string, string> = {
  OPEN: 'text-primary-fixed-dim bg-cyan-500/10',
  QUOTED: 'text-secondary bg-secondary/10',
  FULFILLED: 'text-outline bg-surface-variant',
};

const priorityColors: Record<string, string> = {
  HIGH: 'text-error bg-error/10',
  MED: 'text-secondary bg-secondary/10',
  LOW: 'text-outline bg-surface-variant',
};

export default function SupplyHubPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <AppShell activeHref="/guild/supply">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Supply Hub</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Manage procurement requests and supplier quotes.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-sm px-md py-sm bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: 'Open Requests', value: '2', color: 'text-primary-fixed-dim' },
          { label: 'Quoted', value: '1', color: 'text-secondary' },
          { label: 'Fulfilled', value: '1', color: 'text-outline' },
          { label: 'Pending Quotes', value: '2', color: 'text-error' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-md flex flex-col gap-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">{s.label}</span>
            <span className={`font-h2 text-h2 ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">inventory_2</span>
            Supply Requests
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest/50">
                {['Request ID', 'Item', 'Requested By', 'Qty', 'Priority', 'Deadline', 'Status', 'Quotes', 'Actions'].map((h) => (
                  <th key={h} className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors group">
                  <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs">{r.id}</td>
                  <td className="px-md py-sm font-body-sm text-body-sm text-on-surface font-medium">{r.item}</td>
                  <td className="px-md py-sm font-mono-data text-mono-data text-primary-fixed-dim text-xs">{r.requestedBy}</td>
                  <td className="px-md py-sm font-mono-data text-mono-data text-on-surface">{r.qty}</td>
                  <td className="px-md py-sm">
                    <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase ${priorityColors[r.priority]}`}>{r.priority}</span>
                  </td>
                  <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs">{r.deadline}</td>
                  <td className="px-md py-sm">
                    <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase ${statusColors[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-md py-sm text-center">
                    {r.quotes > 0 ? (
                      <span className="font-mono-data text-mono-data text-primary-fixed-dim">{r.quotes}</span>
                    ) : (
                      <span className="text-outline text-xs">—</span>
                    )}
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex gap-sm opacity-50 group-hover:opacity-100 transition-opacity">
                      <button className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors" title="View Quotes">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      {r.status === 'QUOTED' && (
                        <button className="text-on-surface-variant hover:text-primary-container transition-colors" title="Approve">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <h3 className="font-h3 text-h3 text-on-surface mb-lg">New Supply Request</h3>
            <div className="flex flex-col gap-md">
              <label className="flex flex-col gap-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Item Name</span>
                <input className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors" placeholder="e.g. Plasma Core T4" />
              </label>
              <label className="flex flex-col gap-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Quantity</span>
                <input type="number" className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors" placeholder="1" />
              </label>
              <label className="flex flex-col gap-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Priority</span>
                <select className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors">
                  <option value="HIGH">High</option>
                  <option value="MED">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </label>
            </div>
            <div className="flex gap-sm mt-lg justify-end">
              <button onClick={() => setShowModal(false)} className="px-md py-sm border border-outline-variant text-on-surface-variant rounded hover:bg-surface-variant transition-colors font-label-caps text-label-caps">
                Cancel
              </button>
              <button onClick={() => setShowModal(false)} className="px-md py-sm bg-primary-container text-on-primary-container rounded hover:opacity-90 transition-opacity font-label-caps text-label-caps">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
