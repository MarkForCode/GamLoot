'use client';

import { useState } from 'react';
import { AppShell } from '../components/AppShell';

const plans = [
  {
    name: 'Trial',
    price: 'Free',
    period: '',
    features: ['Up to 5 members', '1 guild', 'Basic marketplace', 'Email support'],
    current: false,
    color: 'border-outline-variant',
    buttonClass: 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant',
  },
  {
    name: 'Basic',
    price: '$29',
    period: '/mo',
    features: ['Up to 20 members', 'Auction & bidding', 'Guild bulletin board', 'Standard analytics'],
    current: false,
    color: 'border-outline-variant',
    buttonClass: 'border border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed-dim/10',
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mo',
    features: ['Up to 50 members', 'Full RBAC & roles', 'Revenue share system', 'Multi-layer approvals', 'Advanced reporting', 'Dispute resolution'],
    current: true,
    color: 'border-primary-fixed-dim shadow-[0_0_20px_rgba(0,219,233,0.15)]',
    buttonClass: 'bg-primary-container text-on-primary-container hover:opacity-90',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/mo',
    features: ['300+ members', 'Multi-guild alliance', 'API & Webhook access', 'SSO integration', 'Dedicated support', 'Custom contracts'],
    current: false,
    color: 'border-secondary/50',
    buttonClass: 'border border-secondary text-secondary hover:bg-secondary/10',
  },
];

const invoices = [
  { id: 'INV-2025-06', date: '2025-06-01', amount: '$79.00', status: 'Paid' },
  { id: 'INV-2025-05', date: '2025-05-01', amount: '$79.00', status: 'Paid' },
  { id: 'INV-2025-04', date: '2025-04-01', amount: '$79.00', status: 'Paid' },
];

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <AppShell activeHref="/subscription">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface text-glow-primary">Subscription & Billing</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Manage your plan, payment methods, and billing history.</p>
        </div>
        {/* Billing Toggle */}
        <div className="flex items-center gap-sm bg-surface-container border border-outline-variant rounded-full p-xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-md py-xs rounded-full font-label-caps text-label-caps transition-colors ${billingCycle === 'monthly' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-md py-xs rounded-full font-label-caps text-label-caps transition-colors flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Annual
            <span className="bg-secondary/20 text-secondary text-[9px] px-1 rounded font-black">-20%</span>
          </button>
        </div>
      </div>

      {/* Current Plan Banner */}
      <div className="glass-panel rounded-xl p-lg mb-lg flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-xl bg-primary-container/20 border border-primary-fixed-dim/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-fixed-dim text-2xl">card_membership</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Current Plan</p>
            <h2 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              Pro Plan
              <span className="px-2 py-0.5 bg-primary-container/20 border border-primary-fixed-dim/30 text-primary-fixed-dim rounded font-label-caps text-[10px] uppercase">Active</span>
            </h2>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-xs">
          <p className="font-mono-data text-mono-data text-on-surface">$79.00 / month</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Next renewal: 2025-07-01</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">42 / 50 member seats used</p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        {plans.map((plan) => {
          const annualPrice = plan.price !== 'Free'
            ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8 * 12)}/yr`
            : null;

          return (
            <div key={plan.name} className={`bg-surface-container border rounded-xl p-lg flex flex-col gap-md relative ${plan.color} ${plan.current ? 'ring-1 ring-primary-fixed-dim' : ''}`}>
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-container px-3 py-0.5 rounded-full font-label-caps text-[10px] uppercase">
                  Current Plan
                </div>
              )}
              <div>
                <h3 className="font-h3 text-h3 text-on-surface">{plan.name}</h3>
                <div className="mt-sm flex items-baseline gap-1">
                  <span className="font-mono-data text-[28px] text-on-surface">{plan.price}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{plan.period}</span>
                </div>
                {annualPrice && billingCycle === 'annual' && (
                  <p className="font-label-caps text-[10px] text-secondary mt-xs">{annualPrice} billed annually</p>
                )}
              </div>
              <ul className="flex flex-col gap-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-sm font-body-sm text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary-fixed-dim text-base mt-0.5 shrink-0">check</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-sm rounded font-label-caps text-label-caps transition-all ${plan.buttonClass}`}>
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment & Invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Payment Method */}
        <div className="glass-panel rounded-xl p-lg">
          <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">credit_card</span>
            Payment Method
          </h3>
          <div className="bg-surface-container-high border border-outline-variant rounded-lg p-md flex items-center justify-between mb-md">
            <div className="flex items-center gap-md">
              <div className="w-10 h-7 rounded bg-surface-bright border border-outline-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-on-surface-variant">credit_card</span>
              </div>
              <div>
                <p className="font-body-sm text-body-sm text-on-surface">•••• •••• •••• 4242</p>
                <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Expires 12/27</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-primary-container/20 text-primary-fixed-dim border border-primary-fixed-dim/30 rounded font-label-caps text-[10px] uppercase">Default</span>
          </div>
          <button className="w-full py-sm border border-outline-variant text-on-surface-variant rounded font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center justify-center gap-sm">
            <span className="material-symbols-outlined text-lg">add</span>
            Add Payment Method
          </button>
        </div>

        {/* Invoice History */}
        <div className="glass-panel rounded-xl p-lg">
          <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-fixed-dim">receipt_long</span>
            Invoice History
          </h3>
          <div className="divide-y divide-outline-variant/50">
            {invoices.map((inv) => (
              <div key={inv.id} className="py-md flex items-center justify-between">
                <div>
                  <p className="font-mono-data text-mono-data text-on-surface text-sm">{inv.id}</p>
                  <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">{inv.date}</p>
                </div>
                <div className="flex items-center gap-md">
                  <span className="font-mono-data text-mono-data text-primary-fixed-dim">{inv.amount}</span>
                  <span className="px-2 py-0.5 bg-primary-container/20 text-primary-fixed-dim border border-primary-fixed-dim/30 rounded font-label-caps text-[10px] uppercase">{inv.status}</span>
                  <button className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors">
                    <span className="material-symbols-outlined text-base">download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
