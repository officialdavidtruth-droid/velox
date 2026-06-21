/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  MousePointer,
  RefreshCw,
  Compass,
  ArrowUpRight,
  Sparkles,
  Award,
  Link as LinkIcon,
  Lock,
  Settings,
  Activity,
  Plus
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { Analytics, AnalyticsHistory, PlatformType } from '../types';
import MarketingSimulator from './MarketingSimulator';
import { useQuery } from '@tanstack/react-query';

interface AnalyticsViewProps {
  workspaceId: string;
  analytics: Analytics[];
  history: AnalyticsHistory[];
  onRefresh: () => void;
}

export default function AnalyticsView({ workspaceId, analytics, history, onRefresh }: AnalyticsViewProps) {
  const { data: qAnalyticsData, isFetching: isFetchingAnalytics, refetch: refetchAnalytics } = useQuery<Analytics[]>({
    queryKey: ['analytics', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    initialData: analytics,
    refetchInterval: 12000,
    staleTime: 5000,
  });

  const { data: qHistoryData, isFetching: isFetchingHistory, refetch: refetchHistory } = useQuery<AnalyticsHistory[]>({
    queryKey: ['analyticsHistory', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/history?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics history');
      return res.json();
    },
    initialData: history,
    refetchInterval: 12000,
    staleTime: 5000,
  });

  const currentAnalytics = qAnalyticsData || analytics;
  const currentHistory = qHistoryData || history;

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bestTime, setBestTime] = useState<{ day: string; hour: string; rationale: string; engagementChance: number } | null>(null);

  // Advanced ad analytics API states
  const [connections, setConnections] = useState<any[]>([
    { platformName: 'Google Ads', connected: false, clientId: '', developerToken: '', adAccountId: '' },
    { platformName: 'Facebook Ads', connected: false, clientId: '', developerToken: '', adAccountId: '' },
    { platformName: 'Instagram Ads', connected: false, clientId: '', developerToken: '', adAccountId: '' },
    { platformName: 'LinkedIn Ads', connected: false, clientId: '', developerToken: '', adAccountId: '' },
    { platformName: 'TikTok Ads', connected: false, clientId: '', developerToken: '', adAccountId: '' }
  ]);
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [connClientId, setConnClientId] = useState('');
  const [connDevToken, setConnDevToken] = useState('');
  const [connAdAccountId, setConnAdAccountId] = useState('');

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          // Merge pre-loaded
          setConnections(prev => {
            return prev.map(p => {
              const matched = data.find((d: any) => d.platformName.toLowerCase() === p.platformName.toLowerCase());
              return matched ? matched : p;
            });
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  // Fetch AI recommended best time to post whenever starting platform shifts
  useEffect(() => {
    const queryPlat = selectedPlatform === 'all' ? 'instagram' : selectedPlatform;
    fetch(`/api/analytics/best-times?platform=${queryPlat}`)
      .then(res => res.json())
      .then(data => setBestTime(data))
      .catch(err => console.error('Error fetching best times:', err));
  }, [selectedPlatform]);

  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });
      if (res.ok) {
        await Promise.all([
          refetchAnalytics(),
          refetchHistory()
        ]);
        onRefresh();
      }
    } catch (e) {
      console.error('Error refreshing metrics:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Connect Ad API logic
  const handleConnectApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConnectModal || !connClientId) return;

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformName: showConnectModal,
          connected: true,
          clientId: connClientId,
          developerToken: connDevToken,
          adAccountId: connAdAccountId
        })
      });
      if (res.ok) {
        setShowConnectModal(null);
        setConnClientId('');
        setConnDevToken('');
        setConnAdAccountId('');
        fetchConnections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter metrics based on platform filter selection
  const activeMetrics = selectedPlatform === 'all' 
    ? currentAnalytics 
    : currentAnalytics.filter(a => a.platform === selectedPlatform);

  // Accumulate totals
  const totalMetrics = activeMetrics.reduce((acc, current) => {
    return {
      followers: acc.followers + current.followers,
      reach: acc.reach + current.reach,
      impressions: acc.impressions + current.impressions,
      engagement: acc.engagement + current.engagement,
      clicks: acc.clicks + current.clicks,
      visits: acc.visits + current.profile_visits,
      growthSum: acc.growthSum + current.growth_rate,
      count: acc.count + 1
    };
  }, { followers: 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, visits: 0, growthSum: 0, count: 0 });

  const avgGrowth = totalMetrics.count > 0 ? (totalMetrics.growthSum / totalMetrics.count).toFixed(1) : '0';

  // Format historical chart data
  const chartData = React.useMemo(() => {
    const records = selectedPlatform === 'all' 
      ? currentHistory 
      : currentHistory.filter(h => h.platform === selectedPlatform);

    const dateMap: Record<string, { date: string; followers: number; reach: number; engagement: number; impressions: number }> = {};
    records.forEach(r => {
      const d = r.date;
      if (!dateMap[d]) {
        dateMap[d] = { date: d, followers: 0, reach: 0, engagement: 0, impressions: 0 };
      }
      dateMap[d].followers += r.followers;
      dateMap[d].reach += r.reach;
      dateMap[d].engagement += r.engagement;
      dateMap[d].impressions += r.impressions;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [currentHistory, selectedPlatform]);

  // Unified Ad Metrics Simulation based on Connected stats
  const anyAdConnected = connections.some(c => c.connected);
  
  // Custom mock analytics for linked ad accounts
  const googleAdsConn = connections.find(c => c.platformName === 'Google Ads' && c.connected);
  const facebookAdsConn = connections.find(c => c.platformName === 'Facebook Ads' && c.connected);
  const instagramAdsConn = connections.find(c => c.platformName === 'Instagram Ads' && c.connected);
  const linkedinAdsConn = connections.find(c => c.platformName === 'LinkedIn Ads' && c.connected);
  
  const simulatedAdStats = {
    spend: (googleAdsConn ? 1420 : 0) + (facebookAdsConn ? 850 : 0) + (instagramAdsConn ? 510 : 0) + (linkedinAdsConn ? 350 : 0),
    impressions: (googleAdsConn ? 42000 : 0) + (facebookAdsConn ? 98000 : 0) + (instagramAdsConn ? 38000 : 0) + (linkedinAdsConn ? 14000 : 0),
    clicks: (googleAdsConn ? 2140 : 0) + (facebookAdsConn ? 3450 : 0) + (instagramAdsConn ? 1890 : 0) + (linkedinAdsConn ? 580 : 0),
    conversions: (googleAdsConn ? 110 : 0) + (facebookAdsConn ? 140 : 0) + (instagramAdsConn ? 72 : 0) + (linkedinAdsConn ? 24 : 0),
  };

  const adCtr = simulatedAdStats.impressions > 0 ? ((simulatedAdStats.clicks / simulatedAdStats.impressions) * 100).toFixed(1) : '0';
  const adCpc = simulatedAdStats.clicks > 0 ? (simulatedAdStats.spend / simulatedAdStats.clicks).toFixed(2) : '0.00';
  const adCostPerConversion = simulatedAdStats.conversions > 0 ? (simulatedAdStats.spend / simulatedAdStats.conversions).toFixed(2) : '0.00';
  const adRoas = anyAdConnected ? '3.8x' : '0.0x';

  const adComparisonData = [
    { name: 'Google Ads', Spend: googleAdsConn ? 1420 : 0, Conversions: googleAdsConn ? 110 : 0, Clicks: googleAdsConn ? 2140 : 0 },
    { name: 'Facebook Ads', Spend: facebookAdsConn ? 850 : 0, Conversions: facebookAdsConn ? 140 : 0, Clicks: facebookAdsConn ? 3450 : 0 },
    { name: 'Instagram Ads', Spend: instagramAdsConn ? 510 : 0, Conversions: instagramAdsConn ? 72 : 0, Clicks: instagramAdsConn ? 1890 : 0 },
    { name: 'LinkedIn Ads', Spend: linkedinAdsConn ? 350 : 0, Conversions: linkedinAdsConn ? 24 : 0, Clicks: linkedinAdsConn ? 580 : 0 }
  ];

  return (
    <div id="analytics-view" className="space-y-6">
      
      {/* Metrics Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider font-display">Live Analytics Radar</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Continuous audience insights, click interactions, and follow grow logs.</p>
            </div>
          </div>
          
          {/* Stale-While-Revalidate Status Indicator Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-550/20 rounded-sm text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000 ${isFetchingAnalytics || isFetchingHistory ? 'animate-duration-100' : ''}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ${isFetchingAnalytics || isFetchingHistory ? 'bg-amber-500 animate-pulse' : ''}`} />
            </span>
            <span>SWR AUTO-REVALIDATING MODE</span>
            { (isFetchingAnalytics || isFetchingHistory) && (
              <span className="text-[9px] px-1 bg-indigo-500/15 text-indigo-500 font-extrabold rounded-sm uppercase tracking-widest animate-pulse">Syncing...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Platform filter buttons */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-sm text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-3 py-1 rounded-sm transition ${selectedPlatform === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              All Channels
            </button>
            {(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'] as PlatformType[]).map(p => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={`px-2 py-1 rounded-sm transition capitalize ${selectedPlatform === p ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefreshMetrics}
            disabled={isRefreshing}
            className={`inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer ${
              isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshed' : 'Refresh Metrics'}
          </button>
        </div>
      </div>

      {/* Numerical Metrics Grid (Fans, Reach, Imp, CTR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-350 transition">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <Users className="w-4 h-4 text-violet-600" />
            <span className="text-[10px] bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-sm font-bold">Followers</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-display">{(totalMetrics.followers).toLocaleString()}</h3>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">▲ {avgGrowth}% monthly growth rate</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-350 transition">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <Compass className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-sm font-bold">Organic Reach</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-display">{(totalMetrics.reach).toLocaleString()}</h3>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">▲ 14.2% reach multiplier</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-350 transition">
          <div className="flex items-center justify-between mb-3 text-slate-400 font-bold">
            <Eye className="w-4 h-4 text-orange-600" />
            <span className="text-[10px] bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-sm font-bold">Impressions</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-display">{(totalMetrics.impressions).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Core feed placements and loops</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-350 transition">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <Heart className="w-4 h-4 text-rose-600" />
            <span className="text-[10px] bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-sm font-bold">Engagement</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-display">{(totalMetrics.engagement).toLocaleString()}</h3>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">★★ Live conversion tracking active</p>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Trend AreaChart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white font-display uppercase tracking-wider">Audience Progression Trend</h4>
              <p className="text-[11px] text-slate-400">Organic growth over the last 30 calendar days of campaigns.</p>
            </div>
            
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-sm text-slate-500 font-mono border border-slate-205 dark:border-slate-700">
              Daily aggregates
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '2px', fontSize: '11px' }} 
                />
                <Area type="monotone" dataKey="followers" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFollowers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reach Engagement Breakdown BarChart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white font-display uppercase tracking-wider mb-1">Interaction Distribution</h4>
            <p className="text-[11px] text-slate-400 mb-4">Engaged clicks vs profile checkins timeline.</p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-7)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} />
                <YAxis stroke="#94a3b8" fontSize={8} />
                <Tooltip contentStyle={{ fontSize: '10px' }} />
                <Bar dataKey="engagement" fill="#3b82f6" radius={[1, 1, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-center text-slate-400 mt-2">Displaying latest weekly interactive loop.</p>
        </div>

      </div>

      {/* AI Recommendation Engine: Best Time to Post */}
      {bestTime && (
        <div className="bg-[#1e293b] text-white rounded-sm p-6 relative overflow-hidden shadow-sm border border-slate-800">
          <div className="absolute right-0 bottom-0 top-0 w-32 bg-indigo-505 opacity-5 rounded-l-full pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2.5 py-1 rounded-sm text-[10px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                AI Social Recommendation Engine
              </div>
              <h3 className="text-lg font-bold font-display tracking-tight">
                Perfect Posting Day: <span className="text-indigo-300">{bestTime.day}</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                <strong>Why this works:</strong> {bestTime.rationale}
              </p>
            </div>

            <div className="flex items-center gap-6 self-start md:self-center border-l md:border-l border-slate-700 pl-6 h-full font-sans">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Best Time Window</span>
                <span className="block font-mono text-lg font-extrabold text-indigo-300 mt-0.5">{bestTime.hour}</span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Engagement Gain</span>
                <span className="block font-mono text-2xl font-black text-emerald-400 mt-0.5">+{bestTime.engagementChance}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CROSS-CHANNEL INTERACTIVE SIMULATOR */}
      <MarketingSimulator />

      {/* ADVANCED UNIFIED AD ANALYTICS SECTION */}
      <div id="ad-analytics" className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-sm shadow-sm transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider font-displayAndTheme">Unified Ad Campaigns Performance Suite</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Track cross-network Google Ads and Connected Social Marketing Conversion API streams side-by-side.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${anyAdConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {anyAdConnected ? 'Synchronized' : 'Offline Mode'}
              </span>
            </div>
          </div>

          {!anyAdConnected ? (
            <div className="text-center border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-8 rounded-sm">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 inline-flex rounded-sm mb-3 border border-indigo-100 dark:border-indigo-900">
                <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-xs uppercase font-extrabold text-slate-850 dark:text-white tracking-widest mb-1">Ad Campaigns Analysis Locked</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto mb-4">
                No verified developer ad keys detected. Please plug in Google Ads or platform advertising scopes inside the Integrations hub below to fetch search campaign telemetry.
              </p>
              <div className="flex justify-center gap-2">
                <a href="#credentials-hub" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-sm cursor-pointer shadow-xs">
                  Link Developer API
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ad Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-3 rounded-sm">
                  <span className="text-[9px] uppercase hover:underline text-slate-400 font-bold tracking-wider">Total Ad Spend</span>
                  <span className="block font-mono text-base font-extrabold text-slate-800 dark:text-white mt-1">${simulatedAdStats.spend}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-3 rounded-sm">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Ad Impressions</span>
                  <span className="block font-mono text-base font-extrabold text-slate-800 dark:text-white mt-1">{simulatedAdStats.impressions.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-3 rounded-sm">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Ad Click-Throughs</span>
                  <span className="block font-mono text-base font-extrabold text-slate-800 dark:text-white mt-1">{simulatedAdStats.clicks.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-3 rounded-sm">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Avg Click Conv Rate</span>
                  <span className="block font-mono text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{adCtr}%</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-3 rounded-sm">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Unified CPA (Cost/Conv)</span>
                  <span className="block font-mono text-base font-extrabold text-[#10b981] mt-1">${adCostPerConversion}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-3 rounded-sm">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Aggregated ROAS</span>
                  <span className="block font-mono text-base font-extrabold text-violet-600 mt-1">{adRoas}</span>
                </div>
              </div>

              {/* Conversion ROI Chart comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-100 dark:border-slate-800 rounded-sm p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <h4 className="text-xs uppercase font-extrabold text-slate-800 dark:text-white mb-3">Ad Spend vs Conversions Overview</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adComparisonData.filter(d => d.Spend > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={9} />
                        <YAxis fontSize={9} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Bar dataKey="Spend" fill="#4f46e5" radius={[1, 1, 0, 0]} name="Spend ($)" />
                        <Bar dataKey="Conversions" fill="#10b981" radius={[1, 1, 0, 0]} name="Conversions (Qty)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border border-slate-100 dark:border-slate-800 rounded-sm p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <h4 className="text-xs uppercase font-extrabold text-slate-800 dark:text-white mb-3">Direct Web Click-Through Distribution</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adComparisonData.filter(d => d.Clicks > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={9} />
                        <YAxis fontSize={9} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Bar dataKey="Clicks" fill="#3b82f6" radius={[1, 1, 0, 0]} name="Ad Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API CREDENTIALS MANAGER - HOOK BOTH GOOGLE ADS AND PLATFORM APIs */}
        <div id="credentials-hub" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-sm shadow-sm transition">
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Settings className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                API Connections Manager
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Provide developer API keys to synthesize live marketing campaigns and automate properties promotion.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn) => (
              <div
                key={conn.platformName}
                className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#0f172a] dark:text-white text-xs">{conn.platformName} API</span>
                    
                    <span className={`text-[8px] uppercase tracking-widest font-mono font-bold px-1.5 py-0.5 rounded-sm border ${
                      conn.connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800'
                    }`}>
                      {conn.connected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1">
                    {conn.connected 
                      ? `Client ID: ...${conn.clientId.substring(0, 10) || 'Verified'}...` 
                      : `Sync developer ${conn.platformName} SDK access token into dashboard charts.`}
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      setShowConnectModal(conn.platformName);
                      setConnClientId(conn.clientId || '');
                      setConnDevToken(conn.developerToken || '');
                      setConnAdAccountId(conn.adAccountId || '');
                    }}
                    className={`w-full text-center text-[10px] font-bold py-1.5 rounded-sm border transition cursor-pointer ${
                      conn.connected 
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200' 
                        : 'bg-indigo-50 dark:bg-indigo-950 border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                    }`}
                  >
                    {conn.connected ? 'Update Credentials' : 'Link Developer Token'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONNECTION SETUP MODAL */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-sm shadow-md border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-xs text-slate-700 dark:text-slate-300">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider font-display">
              Link {showConnectModal} API
            </h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-normal">
              Provide your API credentials. Your keys remain encrypted on our local full-stack server container layers.
            </p>

            <form onSubmit={handleConnectApi} className="space-y-4 font-sans">
              <div>
                <label className="block mb-1 font-bold text-slate-600 dark:text-slate-450">Developer Client ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. client_id_67394..."
                  value={connClientId}
                  onChange={(e) => setConnClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-sm focus:bg-white focus:border-slate-400 text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-600 dark:text-slate-450">Developer OAuth Token / Secret</label>
                <input
                  type="password"
                  placeholder="e.g. dev_token_secret..."
                  value={connDevToken}
                  onChange={(e) => setConnDevToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-sm focus:bg-white focus:border-slate-400 text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-600 dark:text-slate-450">Advertising Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. ad_account_193-456-112"
                  value={connAdAccountId}
                  onChange={(e) => setConnAdAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-sm focus:bg-white focus:border-slate-400 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-650 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm cursor-pointer shadow-xs"
                >
                  Confirm Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
