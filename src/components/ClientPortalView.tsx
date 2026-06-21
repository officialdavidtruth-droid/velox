/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Compass, Users, Clock, Flame, Calendar, Sparkles, Check, Link, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface ClientPortalViewProps {
  shareToken: string;
}

export default function ClientPortalView({ shareToken }: ClientPortalViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPortalData = async () => {
    try {
      const res = await fetch(`/api/portal/${shareToken}`);
      const payload = await res.json();
      if (res.ok) {
        setData(payload);
      } else {
        throw new Error(payload.error || 'Portal links expired or disabled.');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold">Loading secure live client report portal...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center font-sans">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md">
          <p className="text-sm font-extrabold text-red-600 mb-2">Secure Link Suspended</p>
          <p className="text-xs text-slate-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // Aggregate stats for display
  const totalFollowers = data.analytics.reduce((acc: number, item: any) => acc + item.followers, 0);
  const totalReach = data.analytics.reduce((acc: number, item: any) => acc + item.reach, 0);
  const totalEngagement = data.analytics.reduce((acc: number, item: any) => acc + item.engagement, 0);

  return (
    <div className="min-h-screen bg-[#fafbfc] py-8 px-4 sm:px-6 font-sans antialiased text-[#0f172a]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Portal Client Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">Live Read-Only Reporting Portal</span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display mt-2">{data.workspaceName} Report Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Direct read-only live brand diagnostics dashboard. Auto-refreshed instantly by your agency.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPortalData}
              className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className="w-3" /> Force Refresh
            </button>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">● Secure Live Feed</span>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Fan Base Growth</span>
            <div className="text-2xl font-extrabold text-slate-800 font-display">{(totalFollowers).toLocaleString()}</div>
            <p className="text-[10px] text-emerald-600 mt-1">Verified collective stats across networks</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total Organic Reach</span>
            <div className="text-2xl font-extrabold text-slate-800 font-display">{(totalReach).toLocaleString()}</div>
            <p className="text-[10px] text-slate-400 mt-1">Feed views on connected accounts</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total Fan Engagement</span>
            <div className="text-2xl font-extrabold text-slate-800 font-display">{(totalEngagement).toLocaleString()}</div>
            <p className="text-[10px] text-slate-400 mt-1">Likes, comments, shares and bookmarks</p>
          </div>
        </div>

        {/* Live Content Calendar + Schedule list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of active scheduled / published posts */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-6">
            <div>
              <h2 className="text-md font-bold text-slate-800 font-display">Planned Campaign Pipelines</h2>
              <p className="text-[11px] text-slate-400">Current calendar slots and promotional drafts queued by marketing manager.</p>
            </div>

            <div className="space-y-4">
              {data.scheduled.map((p: any) => (
                <div key={p.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold uppercase text-[9px] px-2 py-0.5 rounded">
                      {p.platforms.join(' | ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(p.publish_date).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-800 mb-1">{p.title}</h3>
                  <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick interactive sidebar calendar summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800 font-display">Schedule Gaps</h3>
            </div>

            <div className="space-y-3">
              {data.calendar.map((ev: any) => (
                <div key={ev.id} className="border-l-4 border-indigo-500 bg-indigo-50/40 p-2.5 rounded text-xs space-y-1">
                  <div className="font-bold text-slate-800 truncate">{ev.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
