/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CreditCard, Check, Sparkles, AlertCircle, Award, Ticket } from 'lucide-react';

interface BillingManagerProps {
  subscription: {
    plan_type: 'starter' | 'pro' | 'agency';
    billing_cycle: 'monthly' | 'annual';
    status: 'active' | 'trial' | 'canceled';
    current_period_end: string;
  };
  onRefresh: () => void;
}

export default function BillingManager({ subscription, onRefresh }: BillingManagerProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  const handleUpgrade = async (planType: 'pro' | 'agency') => {
    setUpgradingTo(planType);
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType,
          billingCycle
        })
      });

      if (res.ok) {
        alert(`Congratulations! You have upgraded to the Premium ${planType.toUpperCase()} Plan. Check your dashboard for booster credits.`);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpgradingTo(null);
    }
  };

  // Pricing calculations
  const proPrice = billingCycle === 'annual' ? 26 : 29; // 10% discount on annual (~$313 vs ~$280 per year)
  const agencyPrice = billingCycle === 'annual' ? 71 : 79; // 10% discount on annual (~$850 vs ~$760 per year)

  return (
    <div id="billing-manager-view" className="space-y-6">
      
      {/* Active Membership Status Block */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Ticket className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-md font-bold text-slate-800 font-display">Active Subscriptions</h3>
            <p className="text-xs text-slate-400 capitalize">
              Currently enjoying {subscription.plan_type} plan • billed {subscription.billing_cycle}
            </p>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs font-medium text-slate-700">
          <div className="font-bold text-indigo-950">Next renewal: {new Date(subscription.current_period_end).toLocaleDateString()}</div>
          <div className="text-[10px] text-indigo-700">Payment will be automatically processed via Stripe security vault.</div>
        </div>
      </div>

      {/* Monthly vs Annual Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1.5 rounded-lg inline-flex items-center gap-2 border border-slate-200">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1 rounded-md text-xs font-extrabold cursor-pointer transition-all ${
              billingCycle === 'monthly' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1 rounded-md text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1 ${
              billingCycle === 'annual' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Annual Billing
            <span className="bg-indigo-600 text-white text-[8px] font-black px-1 py-[2px] rounded-sm tracking-uppercase uppercase">-10%</span>
          </button>
        </div>
      </div>

      {/* Plan Tier Choice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Starter Plan card */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-3xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Free Trials</span>
              <h4 className="text-lg font-black text-slate-800 font-display mt-2">Starter Package</h4>
              <p className="text-xs text-slate-400 mt-1">Excellent for checking out dashboard options.</p>
            </div>

            <div className="py-2">
              <span className="text-3xl font-black font-display text-slate-800">$0</span>
              <span className="text-xs text-slate-400">/ forever free</span>
            </div>

            <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> 1 Linked Workspace Brand</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> Basic Content Calendar</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> 20 AI Lead Finder credits</li>
            </ul>
          </div>

          <button
            disabled
            className="w-full mt-6 py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-lg cursor-not-allowed"
          >
            {subscription.plan_type === 'starter' ? 'Current Package' : 'Basic Tier'}
          </button>
        </div>

        {/* Pro Plan card */}
        <div className="bg-white border-2 border-indigo-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between relative">
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white font-extrabold text-[9px] tracking-widest px-3 py-1 rounded-full uppercase">RECOMMENDED</span>
          
          <div className="space-y-4">
            <div>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Growth Agencies</span>
              <h4 className="text-lg font-black text-slate-800 font-display mt-2">Pro Plan</h4>
              <p className="text-xs text-slate-400 mt-1">Accelerate content streams and scale clients scheduling.</p>
            </div>

            <div className="py-2">
              <span className="text-3xl font-black font-display text-slate-800">${proPrice}</span>
              <span className="text-xs text-slate-400">/ billing {billingCycle}</span>
            </div>

            <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> 3 Workspaces Management</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> AI Caption Copywriter (Unlimited)</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> 150 Lead Search Credits included</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> Shareable Secure live portal reports</li>
            </ul>
          </div>

          <button
            onClick={() => handleUpgrade('pro')}
            disabled={subscription.plan_type === 'pro' || upgradingTo !== null}
            className={`w-full mt-6 py-2 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer ${
              subscription.plan_type === 'pro' ? 'bg-slate-200 text-slate-600 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {subscription.plan_type === 'pro' ? 'Current Package' : upgradingTo === 'pro' ? 'Authorizing SDK...' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Agency Plan card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-white flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Ultimate Tier</span>
              <h4 className="text-lg font-black text-white font-display mt-2">Agency Elite</h4>
              <p className="text-xs text-slate-400 mt-1">Complete command of client and team portfolios.</p>
            </div>

            <div className="py-2">
              <span className="text-3xl font-black font-display text-indigo-300">${agencyPrice}</span>
              <span className="text-xs text-slate-400">/ billing {billingCycle}</span>
            </div>

            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-4">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Up to 6 Workspace Brands</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> AI Caption Copywriter (Unlimited)</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> 400 Lead Search Credits included</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Custom branding portals for clients</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400" /> Live Priority VIP support status</li>
            </ul>
          </div>

          <button
            onClick={() => handleUpgrade('agency')}
            disabled={subscription.plan_type === 'agency' || upgradingTo !== null}
            className={`w-full mt-6 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              subscription.plan_type === 'agency' ? 'bg-slate-800 text-slate-500 cursor-default' : 'bg-indigo-500 text-slate-950 hover:bg-indigo-400'
            }`}
          >
            {subscription.plan_type === 'agency' ? 'Current Package' : upgradingTo === 'agency' ? 'Connecting API...' : 'Upgrade to Agency'}
          </button>
        </div>

      </div>

    </div>
  );
}
