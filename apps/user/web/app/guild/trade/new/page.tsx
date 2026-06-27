'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';

export default function TradeCreationPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', price: '', mode: 'auction', visibility: 'guild', quantity: '1' });
  const [submitting, setSubmitting] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/tenants/1/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          start_price: parseFloat(form.price) || 0,
          mode: form.mode,
          visibility: form.visibility,
          quantity: parseInt(form.quantity, 10) || 1,
          guild_id: 1,
          created_by: 'current-user',
        }),
      });
      if (res.ok) {
        router.push('/seller/listings');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell activeHref="/guild/trade/new">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-lg">
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Create Trade Listing</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">List an item for auction or direct sale within your guild.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          {/* Basic Info */}
          <section className="glass-panel rounded-xl p-xl flex flex-col gap-md">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim">info</span>
              Item Details
            </h3>
            <label className="flex flex-col gap-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Item Name *</span>
              <input
                required
                className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder:text-on-surface-variant/50"
                placeholder="e.g. Void Blade (Legendary)"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Description</span>
              <textarea
                rows={3}
                className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder:text-on-surface-variant/50 resize-none"
                placeholder="Describe the item, its stats, rarity, and condition..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Quantity</span>
              <input
                type="number"
                min="1"
                className="bg-surface border border-outline-variant rounded px-md py-sm text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all w-32"
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
              />
            </label>
          </section>

          {/* Pricing */}
          <section className="glass-panel rounded-xl p-xl flex flex-col gap-md">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim">payments</span>
              Pricing & Mode
            </h3>
            {/* Mode Toggle */}
            <div>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest block mb-sm">Listing Mode</span>
              <div className="flex gap-sm">
                {['auction', 'direct'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update('mode', mode)}
                    className={`flex-1 py-sm px-md rounded border font-label-caps text-label-caps uppercase transition-all flex items-center justify-center gap-sm ${
                      form.mode === mode
                        ? 'bg-primary-container/20 border-primary-fixed-dim text-primary-fixed-dim'
                        : 'border-outline-variant text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{mode === 'auction' ? 'gavel' : 'sell'}</span>
                    {mode === 'auction' ? 'Auction' : 'Direct Sale'}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                {form.mode === 'auction' ? 'Starting Price (CR) *' : 'Sale Price (CR) *'}
              </span>
              <div className="relative">
                <span className="absolute left-md top-1/2 -translate-y-1/2 font-mono-data text-mono-data text-on-surface-variant">CR</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="bg-surface border border-outline-variant rounded pl-10 pr-md py-sm text-on-surface font-mono-data text-mono-data focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all w-full"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                />
              </div>
            </label>
          </section>

          {/* Visibility */}
          <section className="glass-panel rounded-xl p-xl flex flex-col gap-md">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim">visibility</span>
              Visibility
            </h3>
            <div className="grid grid-cols-2 gap-sm">
              {[
                { value: 'guild', label: 'Guild Only', icon: 'shield', desc: 'Only your guild members can see and bid.' },
                { value: 'public', label: 'Public', icon: 'public', desc: 'Visible to all platform users.' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('visibility', opt.value)}
                  className={`p-md rounded border text-left transition-all ${
                    form.visibility === opt.value
                      ? 'bg-primary-container/20 border-primary-fixed-dim'
                      : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl mb-xs block ${form.visibility === opt.value ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
                    {opt.icon}
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface font-semibold">{opt.label}</p>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-xs">{opt.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Preview & Submit */}
          <section className="glass-panel rounded-xl p-xl">
            <h3 className="font-h3 text-h3 text-on-surface mb-md">Preview</h3>
            <div className="bg-surface-container-high border border-outline-variant rounded-lg p-md mb-lg">
              <div className="flex justify-between items-start gap-md">
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface font-semibold">{form.title || 'Item Name'}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">{form.description || 'Item description will appear here.'}</p>
                  <div className="flex gap-sm mt-sm flex-wrap">
                    <span className="bg-surface-bright px-2 py-0.5 rounded font-label-caps text-[10px] text-on-surface-variant border border-outline-variant uppercase">{form.mode}</span>
                    <span className="bg-surface-bright px-2 py-0.5 rounded font-label-caps text-[10px] text-on-surface-variant border border-outline-variant uppercase">{form.visibility}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-xs">
                    {form.mode === 'auction' ? 'Starting' : 'Price'}
                  </p>
                  <p className="font-mono-data text-h3 text-primary-fixed-dim">{form.price ? `${form.price} CR` : '— CR'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-sm justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-xl py-sm border border-outline-variant text-on-surface-variant rounded font-label-caps text-label-caps hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !form.title || !form.price}
                className="px-xl py-sm bg-primary-container text-on-primary-container rounded font-label-caps text-label-caps hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-sm"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                    Create Listing
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </div>
    </AppShell>
  );
}
