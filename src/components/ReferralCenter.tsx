/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, Users, Award, Share2, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Referral {
  id: string;
  referrer_user_id: string;
  referred_email: string;
  status: 'pending' | 'signed_up' | 'upgraded';
  reward_granted: boolean;
  created_at: string;
}

interface Reward {
  id: string;
  user_id: string;
  referral_id: string;
  reward_type: string;
  reward_value: number;
  granted_at: string;
}

interface ReferralCenterProps {
  onRefreshSubscription: () => void;
}

export default function ReferralCenter({ onRefreshSubscription }: ReferralCenterProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [refUrl, setRefUrl] = useState('');
  
  // Submit new referred contact state
  const [referredEmail, setReferredEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [copied, setCopied] = useState(false);

  // Fetch Referral Data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/referrals');
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals || []);
        setRewards(data.rewards || []);
        // Construct unique Referral URL based on share code
        setRefUrl(`${window.location.origin}/#referral/${data.refCode}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(refUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referredEmail) return;

    setSubmitting(true);
    setAlertMsg('');

    try {
      const res = await fetch('/api/referrals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referredEmail })
      });
      const data = await res.json();

      if (res.ok) {
        setAlertMsg(data.message);
        setAlertType('success');
        setReferredEmail('');
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setAlertMsg(err.message);
      setAlertType('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Mock Upgrade flow emulator
  const handleUpgradeSimulate = async (refId: string) => {
    try {
      const res = await fetch('/api/referrals/upgrade-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId: refId })
      });
      
      if (res.ok) {
        // Trigger celebratory confetti in preview!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        fetchData();
        onRefreshSubscription(); // notify dashboard that period extend logs updated
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="referral-system-center" className="space-y-6">
      
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              <Gift className="w-3.5 h-3.5" /> Premium Agency Reward Program
            </div>
            <h3 className="text-xl font-bold font-display tracking-tight leading-none">
              Spread SocialPilot, Earn Free Premium Cycles
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Each user who registers and upgrades to Pro grants you <strong className="text-indigo-300">14 Days of active pricing period expansion</strong>. No rewards caps. Absolute abuse prevention locks in place.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl space-y-1 self-start md:self-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total rewards earned</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {rewards.length * 14} <span className="text-xs font-semibold text-white">Trial Days credited</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Referral Form + abuse check */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-3xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 font-display mb-1.5 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-indigo-600" /> Share Referral Link
            </h4>
            <p className="text-[11px] text-slate-400">Copy this link and send it to other freelancers or businesses.</p>

            <div className="flex items-center gap-2 mt-3 bg-slate-50 border border-slate-200 p-2 rounded-lg justify-between text-xs">
              <span className="font-semibold text-slate-700 truncate max-w-[140px] select-all">{refUrl}</span>
              <button
                onClick={handleCopyLink}
                className="bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1 rounded shadow-3xs hover:text-indigo-600 transition flex items-center gap-1 font-bold text-[10px] cursor-pointer"
              >
                {copied ? <Check className="w-3 text-emerald-600" /> : 'Copy'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h5 className="text-xs font-extrabold text-slate-800 mb-2">Pre-Attribute a Referred Client</h5>
            
            {alertMsg && (
              <div className={`p-3 rounded-lg text-xs mb-3 font-semibold border ${
                alertType === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {alertMsg}
              </div>
            )}

            <form onSubmit={handleSubmitReferral} className="space-y-3 font-semibold text-xs">
              <div>
                <label className="block mb-1 text-slate-600">Referred Contact Email</label>
                <input
                  type="email"
                  required
                  placeholder="contact@otheragency.com"
                  value={referredEmail}
                  onChange={(e) => setReferredEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {submitting ? 'Registering...' : 'Register Referral Client'}
              </button>
            </form>
          </div>
        </div>

        {/* Pending Referrals list with Simulation buttons */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 font-display mb-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Referred Client List & Testing Sandbox
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">
              To test the billing rewards flow: click upgraded simulated button to mimic real payment and watch subscription extensions trigger.
            </p>

            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
              {referrals.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="font-semibold text-xs">No pending clients preloaded.</p>
                </div>
              ) : (
                referrals.map(ref => (
                  <div key={ref.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-slate-100 bg-slate-50/40 rounded-lg text-xs">
                    <div className="space-y-1">
                      <div className="font-extrabold text-[#0f172a]">{ref.referred_email}</div>
                      <div className="text-[9px] text-slate-400">Logged On: {new Date(ref.created_at).toLocaleDateString()}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        ref.status === 'upgraded' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {ref.status}
                      </span>
                      
                      {ref.status !== 'upgraded' && (
                        <button
                          onClick={() => handleUpgradeSimulate(ref.id)}
                          className="px-2.5 py-1 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded transition cursor-pointer"
                        >
                          Simulate Upgrade to Pro (Grant +14d)
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Abuse prevention prevents David Truth from self-referring. Only valid corporate emails accepted.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
