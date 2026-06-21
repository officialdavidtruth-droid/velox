/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Zap, Award, AlertCircle, RefreshCw, ShoppingCart, Check, ListChecks } from 'lucide-react';

interface LeadFinderProps {
  workspaceId: string;
}

interface Lead {
  id: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  social_links: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  confidence_score: number;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  type: 'charge' | 'purchase' | 'bonus';
  created_at: string;
}

export default function LeadFinder({ workspaceId }: LeadFinderProps) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  
  // Credits State
  const [credits, setCredits] = useState({ remaining_credits: 100, total_credits_available: 500 });
  const [history, setHistory] = useState<Transaction[]>([]);
  
  // Scraper results state
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Shop state
  const [buyMsg, setBuyMsg] = useState('');

  const fetchCreditsData = async () => {
    try {
      const res = await fetch('/api/credits/history');
      if (res.ok) {
        const data = await res.json();
        setCredits(data.balance);
        setHistory(data.transactions);
      }
    } catch (e) {
      console.error('Error fetching credits info:', e);
    }
  };

  useEffect(() => {
    fetchCreditsData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword || !location) return;

    setIsSearching(true);
    setErrorMsg('');
    setResults([]);

    try {
      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, location, workspaceId })
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
        fetchCreditsData(); // refresh balances
      } else {
        throw new Error(data.error || 'Server error occurred');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePurchase = async (pkgId: string) => {
    setBuyMsg('');
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkgId })
      });
      if (res.ok) {
        setBuyMsg(`Successfully recharged with your ${pkgId.toUpperCase()} package! Check remaining balances.`);
        fetchCreditsData();
        setTimeout(() => setBuyMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="lead-finder-control" className="space-y-6">
      
      {/* Top Banner Row: Credits Counter display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#1e293b] text-white p-6 rounded-sm border border-slate-800 shadow-sm font-sans">
        
        <div className="space-y-1">
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Credits Monitor</span>
          <h3 className="text-3xl font-black text-indigo-300 font-mono mt-1">
            {credits.remaining_credits} <span className="text-white text-sm font-semibold">Remaining</span>
          </h3>
          <p className="text-[10px] text-slate-400">Consumed: {credits.total_credits_available - credits.remaining_credits} credits of total allocated.</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Crawler Cost Plan</span>
          <h4 className="text-md font-bold mt-1 text-indigo-200">15 credits per search</h4>
          <p className="text-[10px] text-slate-400 leading-normal">Every search crawls social APIs and triggers intelligent lead profiling.</p>
        </div>

        <div className="flex md:justify-end items-center">
          <div className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-sm text-xs space-y-1 max-w-xs">
            <div className="font-bold flex items-center gap-1.5 text-yellow-300">
              <Zap className="w-4 h-4" /> AI Lead Finder is active
            </div>
            <p className="text-[10px] text-slate-300 leading-normal">Target local businesses who need social media services. Pitch them direct!</p>
          </div>
        </div>

      </div>

      {/* Grid: Search & Scrape vs Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
        
        {/* Scrapper Workspace */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
            
            <h3 className="text-sm font-bold text-slate-800 font-display mb-4 uppercase tracking-wider">Launch Local AI Crawler</h3>

            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div>
                <label className="block mb-1.5 text-slate-600">Company Keyword / Niche</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">💼</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boutique Spa, Pizza, Dental Clinic"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-600">Location city / State</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toronto, Texas, London"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition text-xs"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs text-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  {isSearching ? 'Scraping feeds... (15c)' : 'Crawl Leads (15 Credits)'}
                </button>
              </div>
            </form>

            {errorMsg && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Results Sheet list */}
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 font-display mb-4 uppercase tracking-wider">Prospects Profiling Output</h4>

            {results.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm font-bold text-slate-700 font-sans uppercase tracking-tight">No prospects unlocked yet</p>
                <p className="text-xs max-w-sm mx-auto mt-2 leading-relaxed">Crawl high-potential businesses in target countries, scrape emails, phone numbers, and matching social channel pages.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map(lead => (
                  <div key={lead.id} className="border border-slate-200 p-4 rounded-sm hover:border-slate-300 transition bg-slate-50/40 font-sans">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
                      <div>
                        <h5 className="font-extrabold text-[#0f172a] text-md">{lead.business_name}</h5>
                        <p className="text-[10px] text-indigo-600 font-bold">🎯 Smart prospect rank match: {lead.confidence_score}%</p>
                      </div>

                      <div className="flex gap-2">
                        {lead.social_links.instagram && (
                          <a href={lead.social_links.instagram} target="_blank" rel="noopener noreferrer" className="bg-white p-1 text-[10px] border border-slate-200 px-2 rounded-sm hover:border-indigo-400 text-slate-600 font-semibold shadow-2xs">Instagram</a>
                        )}
                        {lead.social_links.facebook && (
                          <a href={lead.social_links.facebook} target="_blank" rel="noopener noreferrer" className="bg-white p-1 text-[10px] border border-slate-200 px-2 rounded-sm hover:border-indigo-400 text-slate-600 font-semibold shadow-2xs">Facebook</a>
                        )}
                        {lead.social_links.linkedin && (
                          <a href={lead.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="bg-white p-1 text-[10px] border border-slate-200 px-2 rounded-sm hover:border-indigo-400 text-slate-600 font-semibold shadow-2xs">LinkedIn</a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] block text-slate-400 uppercase font-semibold">Scraped Email</span>
                        <a href={`mailto:${lead.email}`} className="font-semibold text-indigo-700 hover:underline">{lead.email}</a>
                      </div>
                      <div>
                        <span className="text-[10px] block text-slate-400 uppercase font-semibold">Scraped Phone</span>
                        <span className="font-semibold text-slate-800">{lead.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] block text-slate-400 uppercase font-semibold">Web Site</span>
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 hover:underline">{lead.website}</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SHOP PANEL: Credit recharges */}
        <div className="space-y-6">
          
          <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 font-display mb-3 uppercase tracking-wider">Credit Booster Shop</h4>
            
            {buyMsg && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm p-2.5 text-xs mb-3 font-semibold">
                {buyMsg}
              </div>
            )}

            <div className="space-y-3">
              <div className="border border-slate-200 p-3 rounded-sm hover:border-indigo-400 transition cursor-pointer flex flex-col justify-between" onClick={() => handlePurchase('starter')}>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-slate-800">50 Credits Packs</span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 rounded-sm font-black">$10</span>
                </div>
                <button className="mt-2 w-full py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-sm text-[10px] font-bold">Buy Starter Booster</button>
              </div>

              <div className="border border-indigo-300 p-3 rounded-sm hover:border-indigo-450 transition cursor-pointer flex flex-col justify-between relative" onClick={() => handlePurchase('premium')}>
                <span className="absolute -top-1.5 right-2 bg-yellow-400 text-yellow-950 font-black text-[7px] tracking-wide px-1 rounded-sm">POPULAR</span>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-slate-800">200 Credits Packs</span>
                  <span className="text-xs bg-indigo-700 text-white px-1.5 rounded-sm font-black">$29</span>
                </div>
                <button className="mt-2 w-full py-1 bg-indigo-600 hover:bg-slate-900 text-white rounded-sm text-[10px] font-bold shadow-xs">Buy Premium Booster</button>
              </div>

              <div className="border border-slate-200 p-3 rounded-sm hover:border-indigo-400 transition cursor-pointer flex flex-col justify-between" onClick={() => handlePurchase('unlimited')}>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-slate-800">1000 Credits Packs</span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 rounded-sm font-black">$99</span>
                </div>
                <button className="mt-2 w-full py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-sm text-[10px] font-bold">Buy Corporate Booster</button>
              </div>
            </div>
          </div>

          {/* Transactions audit logs list */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm">
            <h4 className="text-xs font-bold text-slate-800 font-display mb-3 uppercase tracking-wider">Balance Ledger System</h4>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.map(t => (
                <div key={t.id} className="bg-white p-2.5 rounded-sm border border-slate-200 text-[10px] space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-700 truncate max-w-[125px]">{t.description}</span>
                    <span className={t.amount < 0 ? 'text-rose-600 font-mono' : 'text-emerald-400 font-mono'}>
                      {t.amount < 0 ? '' : '+'}{t.amount}
                    </span>
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
