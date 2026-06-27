'use client';

import { useState } from 'react';
import { AdminShell } from '../components/AdminShell';

const platforms = [
  { id: 'PLT-001', name: 'StarForge Online', publisher: 'Nexon Corp', status: 'ACTIVE', guilds: 142, lastSync: '2025-06-14 10:22', apiStatus: 'OK', region: 'Asia-Pacific' },
  { id: 'PLT-002', name: 'Void Realm', publisher: 'Blizzard Studios', status: 'ACTIVE', guilds: 98, lastSync: '2025-06-14 10:18', apiStatus: 'OK', region: 'Global' },
  { id: 'PLT-003', name: 'Aether Chronicles', publisher: 'Square Soft', status: 'SYNC_ERROR', guilds: 67, lastSync: '2025-06-13 08:45', apiStatus: 'ERROR', region: 'Japan' },
  { id: 'PLT-004', name: 'Iron Dominion', publisher: 'Ubisoft', status: 'PENDING', guilds: 35, lastSync: 'Never', apiStatus: 'PENDING', region: 'Europe' },
];

const statusMeta: Record<string, { color: string; dot: string; label: string }> = {
  ACTIVE: { color: 'text-primary-fixed-dim bg-cyan-500/10', dot: 'bg-primary-fixed-dim shadow-[0_0_4px_#00dbe9]', label: 'Active' },
  SYNC_ERROR: { color: 'text-error bg-error/10', dot: 'bg-error shadow-[0_0_4px_#ffb4ab]', label: 'Sync Error' },
  PENDING: { color: 'text-secondary bg-secondary/10', dot: 'bg-secondary shadow-[0_0_4px_#ecb2ff]', label: 'Pending' },
};

export default function PlatformsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <AdminShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Game Platform Management</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Manage game connectors, API credentials, and sync status.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-sm px-md py-sm bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Register Platform
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-lg">
        {[
          { label: 'Total Platforms', value: '4', color: 'text-on-surface' },
          { label: 'Active', value: '2', color: 'text-primary-fixed-dim' },
          { label: 'Sync Errors', value: '1', color: 'text-error' },
          { label: 'Total Guilds', value: '342', color: 'text-secondary' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-md">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">{s.label}</p>
            <p className={`font-h2 text-h2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Platform Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">videogame_asset</span>
            Registered Platforms
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest/50">
                {['Platform', 'Publisher', 'Region', 'Guilds', 'API Status', 'Last Sync', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => {
                const meta = statusMeta[p.status];
                return (
                  <tr key={p.id} className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors group">
                    <td className="px-md py-sm">
                      <div>
                        <p className="font-body-sm text-body-sm text-on-surface font-semibold">{p.name}</p>
                        <p className="font-mono-data text-mono-data text-on-surface-variant text-xs">{p.id}</p>
                      </div>
                    </td>
                    <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">{p.publisher}</td>
                    <td className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant text-xs uppercase">{p.region}</td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-on-surface">{p.guilds}</td>
                    <td className="px-md py-sm">
                      <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 w-fit ${p.apiStatus === 'OK' ? 'text-primary-fixed-dim bg-cyan-500/10' : p.apiStatus === 'ERROR' ? 'text-error bg-error/10' : 'text-secondary bg-secondary/10'}`}>
                        <span className={`w-1 h-1 rounded-full ${p.apiStatus === 'OK' ? 'bg-primary-fixed-dim shadow-[0_0_4px_#00dbe9]' : p.apiStatus === 'ERROR' ? 'bg-error shadow-[0_0_4px_#ffb4ab]' : 'bg-secondary'}`} />
                        {p.apiStatus}
                      </span>
                    </td>
                    <td className="px-md py-sm font-mono-data text-mono-data text-on-surface-variant text-xs">{p.lastSync}</td>
                    <td className="px-md py-sm">
                      <span className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase flex items-center gap-1 w-fit ${meta.color}`}>
                        <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex gap-sm opacity-50 group-hover:opacity-100 transition-opacity">
                        <button className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors" title="Sync Now">
                          <span className="material-symbols-outlined text-lg">sync</span>
                        </button>
                        <button className="text-on-surface-variant hover:text-secondary transition-colors" title="Configure">
                          <span className="material-symbols-outlined text-lg">settings</span>
                        </button>
                        {p.status !== 'ACTIVE' && (
                          <button className="text-on-surface-variant hover:text-primary-container transition-colors" title="Activate">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Platform Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-xl w-full max-w-md">
            <h3 className="font-h3 text-h3 text-on-surface mb-lg">Register Game Platform</h3>
            <div className="flex flex-col gap-md">
              {[
                { label: 'Platform Name', placeholder: 'e.g. StarForge Online' },
                { label: 'Publisher', placeholder: 'e.g. Nexon Corp' },
                { label: 'API Endpoint URL', placeholder: 'https://api.game.com/v1' },
                { label: 'API Key', placeholder: '••••••••••••••••' },
              ].map((f) => (
                <label key={f.label} className="flex flex-col gap-xs">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">{f.label}</span>
                  <input className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors" placeholder={f.placeholder} />
                </label>
              ))}
            </div>
            <div className="flex gap-sm mt-lg justify-end">
              <button onClick={() => setShowModal(false)} className="px-md py-sm border border-outline-variant text-on-surface-variant rounded hover:bg-surface-variant transition-colors font-label-caps text-label-caps">Cancel</button>
              <button onClick={() => setShowModal(false)} className="px-md py-sm bg-primary-container text-on-primary-container rounded hover:opacity-90 transition-opacity font-label-caps text-label-caps">Register</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
