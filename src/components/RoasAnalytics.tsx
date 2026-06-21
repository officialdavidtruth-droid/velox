import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Coins, 
  BarChart3, 
  Target, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  SlidersHorizontal, 
  Layers, 
  Table, 
  Zap, 
  CheckCircle2, 
  Building, 
  Percent, 
  Play, 
  Pause, 
  ArrowUpRight, 
  Lock, 
  Info, 
  Sparkles,
  HelpCircle,
  Key,
  Shield,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused';
  spend: number;
  clicks: number;
  impressions: number;
  conversionWeight: number; // multiplier for social attribution
}

interface SocialConversionPoint {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  rawConversionsCount: number;
  shares: number;
  engagement: number;
}

export default function RoasAnalytics() {
  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never synced');
  const [isSynced, setIsSynced] = useState(false);

  // Calibration Controls
  const [averageBookingValue, setAverageBookingValue] = useState<number>(350); 
  const [attributionModel, setAttributionModel] = useState<'first-click' | 'last-click' | 'linear' | 'u-shaped'>('linear');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active workspace simulation credentials
  const [adAccountId, setAdAccountId] = useState('gads-902-114-569');
  const [devTokenStatus, setDevTokenStatus] = useState<'linked' | 'unlinked'>('linked');

  // Hardcoded simulation core data
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([
    { id: 'c_luxury_villa', name: '🌴 Oceanfront Luxury Villa Search', status: 'active', spend: 3200, clicks: 4120, impressions: 84000, conversionWeight: 1.25 },
    { id: 'c_gourmet_tasting', name: '🍷 Bistro Sommelier Night VIP Push', status: 'active', spend: 1850, clicks: 2450, impressions: 41200, conversionWeight: 1.10 },
    { id: 'c_retreat_couples', name: '🧘 Staycation Couples Retreat', status: 'active', spend: 1400, clicks: 1980, impressions: 32800, conversionWeight: 0.95 },
    { id: 'c_membership_club', name: '💼 Elite Private Club Enrolment', status: 'paused', spend: 650, clicks: 750, impressions: 14500, conversionWeight: 1.50 }
  ]);

  const socialBaseConversions: SocialConversionPoint[] = [
    { platform: 'instagram', rawConversionsCount: 84, shares: 1420, engagement: 2400 },
    { platform: 'facebook', rawConversionsCount: 96, shares: 980, engagement: 1850 },
    { platform: 'tiktok', rawConversionsCount: 65, shares: 5400, engagement: 8900 },
    { platform: 'linkedin', rawConversionsCount: 32, shares: 410, engagement: 1200 }
  ];

  // Daily correlation projection data
  const correlationTimeline = [
    { day: 'Jun 12', adSpend: 150, instagramConv: 4, facebookConv: 6, tiktokConv: 8, linkedinConv: 2 },
    { day: 'Jun 13', adSpend: 240, instagramConv: 9, facebookConv: 11, tiktokConv: 14, linkedinConv: 3 },
    { day: 'Jun 14', adSpend: 310, instagramConv: 13, facebookConv: 14, tiktokConv: 19, linkedinConv: 5 },
    { day: 'Jun 15', adSpend: 380, instagramConv: 18, facebookConv: 15, tiktokConv: 24, linkedinConv: 8 },
    { day: 'Jun 16', adSpend: 420, instagramConv: 22, facebookConv: 21, tiktokConv: 29, linkedinConv: 10 },
    { day: 'Jun 17', adSpend: 540, instagramConv: 28, facebookConv: 27, tiktokConv: 38, linkedinConv: 14 },
    { day: 'Jun 18', adSpend: 620, instagramConv: 35, facebookConv: 34, tiktokConv: 48, linkedinConv: 18 }
  ];

  // Sync animation simulation
  const handleTriggerSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs([]);
    const steps = [
      'Establishing SSL connection to Google Ads Developer API v16...',
      'Validating oauth client certificate fingerprint [SHA-256]...',
      'Mapping campaigns ledger for Active adAccountId: ' + adAccountId + '...',
      'Pulling daily impressions and CPC arrays downstream...',
      'Hooking multi-channel conversions callback payload...',
      'Generating localized Attribution Vector under ' + attributionModel.toUpperCase() + ' model...',
      'Database handshake complete. Automated ROAS recalculated successfully!'
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setSyncLogs(prev => [...prev, steps[current]]);
        current++;
      } else {
        clearInterval(interval);
        setIsSyncing(false);
        setIsSynced(true);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 700);
  };

  // Quick Action: Boost Budgets on Google Ads API
  const handleBoostBid = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        // Increase spend simulation
        return {
          ...c,
          spend: Math.round(c.spend * 1.15),
          clicks: Math.round(c.clicks * 1.10),
          impressions: Math.round(c.impressions * 1.12),
          conversionWeight: Number((c.conversionWeight + 0.05).toFixed(2))
        };
      }
      return c;
    }));
  };

  // Quick Action: Pause/Resume Campaign
  const toggleCampaignState = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'active' ? 'paused' : 'active' };
      }
      return c;
    }));
  };

  // --- Dynamic Math Computations Engine (Automated ROAS) ---
  const dynamicCalculations = useMemo(() => {
    // 1. Google Ads Cumulative Spend Selection
    const filteredCampaigns = selectedCampaignId === 'all' 
      ? campaigns 
      : campaigns.filter(c => c.id === selectedCampaignId);

    const totalAdSpend = filteredCampaigns.reduce((sum, c) => sum + (c.status === 'active' ? c.spend : 0), 0);
    const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.status === 'active' ? c.clicks : 0), 0);
    const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.status === 'active' ? c.impressions : 0), 0);

    // 2. Attribution Weight Modifiers according to the active model selected
    let multiplierMap = {
      instagram: 1.0,
      facebook: 1.0,
      tiktok: 1.0,
      linkedin: 1.0
    };

    switch (attributionModel) {
      case 'first-click':
        // High weight on Instagram and TikTok (typically upper funnel)
        multiplierMap = { instagram: 1.35, facebook: 0.9, tiktok: 1.45, linkedin: 0.6 };
        break;
      case 'last-click':
        // High weight on Facebook and LinkedIn (typically bottom funnel / high intent conversions)
        multiplierMap = { instagram: 0.7, facebook: 1.4, tiktok: 0.5, linkedin: 1.55 };
        break;
      case 'u-shaped':
        // Anchored weights on First and Last touch channels, split middle
        multiplierMap = { instagram: 1.2, facebook: 1.1, tiktok: 1.15, linkedin: 1.25 };
        break;
      case 'linear':
      default:
        // Evenly balanced
        multiplierMap = { instagram: 1.0, facebook: 1.0, tiktok: 1.0, linkedin: 1.0 };
        break;
    }

    // Apply campaign-specific conversion weight modifier if selectedCampaignId !== 'all'
    const campaignMod = selectedCampaignId !== 'all' 
      ? (campaigns.find(c => c.id === selectedCampaignId)?.conversionWeight || 1.0) 
      : 1.0;

    // Recalibrate social conversions count
    const attributedPlatformMetrics = socialBaseConversions.map(p => {
      const baseValue = p.rawConversionsCount;
      const modelWeight = multiplierMap[p.platform];
      const finalConversions = Math.round(baseValue * modelWeight * campaignMod);
      const allocatedRevenue = finalConversions * averageBookingValue;
      const allocatedSpend = Math.round(totalAdSpend * (finalConversions / 277)); // proportional distribution of spends

      return {
        ...p,
        conversions: finalConversions,
        allocatedRevenue,
        allocatedSpend,
        roas: totalAdSpend > 0 ? (allocatedRevenue / Math.max(allocatedSpend, 100)) : 0
      };
    });

    const totalConversions = attributedPlatformMetrics.reduce((sum, p) => sum + p.conversions, 0);
    const totalRevenue = totalConversions * averageBookingValue;
    const computedRoas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) : 0;
    
    const overallCpc = totalClicks > 0 ? (totalAdSpend / totalClicks) : 0;
    const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0;
    const overallCpa = totalConversions > 0 ? (totalAdSpend / totalConversions) : 0;

    return {
      totalAdSpend,
      totalClicks,
      totalImpressions,
      totalConversions,
      totalRevenue,
      computedRoas,
      overallCpc,
      overallCtr,
      overallCpa,
      attributedPlatformMetrics
    };
  }, [campaigns, selectedCampaignId, attributionModel, averageBookingValue]);

  // Radars for multi-channel allocation ratios visualization
  const radarChartData = useMemo(() => {
    return dynamicCalculations.attributedPlatformMetrics.map(p => ({
      subject: p.platform.toUpperCase(),
      Conversions: p.conversions,
      Revenue: Math.round(p.allocatedRevenue / 1000), // in thousands
      A: 100
    }));
  }, [dynamicCalculations]);

  return (
    <div id="roas-analytics-view" className="space-y-6">
      
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs transition">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-sm border border-indigo-100 dark:border-indigo-900">
            <Coins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider font-display">Automated ROAS Analytics Panel</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Cross-reference verified Google Ads API traffic records against client social media conversion databases.</p>
          </div>
        </div>

        {/* Sync Controls action bar */}
        <div className="flex items-center gap-2.5 font-sans">
          <div className="hidden sm:flex flex-col text-right text-[10px] text-slate-400">
            <span>Server Sync API Node: <strong className="text-emerald-555 font-mono">{adAccountId}</strong></span>
            <span>Last Handshake: <span className="font-mono text-indigo-500 font-bold">{lastSyncTime}</span></span>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className={`inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white font-extrabold text-xs px-3.5 py-2 rounded-sm shadow-md cursor-pointer transition select-none uppercase tracking-wide`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing...' : 'Sync Ads API'}
          </button>
        </div>
      </div>

      {/* Sync Console Drawer Logs inside workspace bounds */}
      {(isSyncing || syncLogs.length > 0) && (
        <div className="bg-slate-950 text-slate-300 p-4 rounded-sm border border-slate-850 font-mono text-[10px] space-y-1.5 shadow-lg animate-fade-in">
          <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 border-b border-slate-900 pb-1.5 mb-1">
            <span>GOOGLE_ADS_API_CLIENT_AUTHENTICATOR_SESSION</span>
            <span className="text-indigo-400 animate-pulse">● BOUNDED</span>
          </div>
          {syncLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">»</span>
              <span>{log}</span>
            </div>
          ))}
          {isSyncing && (
            <div className="flex items-center gap-2 italic text-slate-450 mt-1 pl-4 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
              <span>Processing TLS payload packet buffers...</span>
            </div>
          )}
        </div>
      )}

      {/* Numerical Metrics Cards Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* AUTOMATED ROAS PROPORTIONAL DIAL CARD */}
        <div className="bg-indigo-900 text-white p-5 rounded-sm relative overflow-hidden shadow-md flex flex-col justify-between border border-indigo-950 min-h-[125px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300 font-mono">Automated ROAS</span>
            <span className="text-[9px] bg-indigo-500/30 border border-indigo-550 text-indigo-200 px-1.5 py-0.5 rounded-sm font-bold font-mono">LIVE CALC</span>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-display tracking-tight text-white font-mono">
              {dynamicCalculations.computedRoas.toFixed(2)}x
            </h3>
            <p className="text-[9.5px] text-indigo-200 mt-1 uppercase font-bold tracking-wide">
              {dynamicCalculations.computedRoas >= 4.0 ? '🔥 Hyper Profitable' : '⭐ Stable Return Level'}
            </p>
          </div>
        </div>

        {/* GOOGLE ADS API TOTAL SPEND */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-350 transition min-h-[125px]">
          <div className="flex items-start justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">Google Ads Spend</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-display text-slate-805 dark:text-white font-mono">
              ${dynamicCalculations.totalAdSpend.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Direct from developer Token</p>
          </div>
        </div>

        {/* ALLOCATED SOCIAL REVENUE */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-350 transition min-h-[125px]">
          <div className="flex items-start justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">Synthesised Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 font-mono">
              ${dynamicCalculations.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Conversions × Avg Value</p>
          </div>
        </div>

        {/* ACCUMULATED CONVERSIONS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-350 transition min-h-[125px]">
          <div className="flex items-start justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">Attributed Bookings</span>
            <Activity className="w-4 h-4 text-pink-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-display text-slate-805 dark:text-white font-mono">
              {dynamicCalculations.totalConversions}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Adjusted by attribution model</p>
          </div>
        </div>

        {/* COST PER ACQUISITION (CPA) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-350 transition min-h-[125px]">
          <div className="flex items-start justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">Attributed CPA</span>
            <Percent className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-display text-slate-805 dark:text-white font-mono">
              ${dynamicCalculations.overallCpa.toFixed(2)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Average user onboarding cost</p>
          </div>
        </div>

      </div>

      {/* Dual Column workspace: Sandbox Controls & Allocation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column (5 cols): Dynamic Financial Calibration Studio */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-550" />
              <div>
                <h3 className="text-xs uppercase font-black text-slate-850 dark:text-white tracking-wider">Calibration Control Room</h3>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">Manipulate conversion values & allocation schemes instantly.</p>
              </div>
            </div>

            <div className="space-y-5">
              
              {/* Slider 1: Average Booking / Conversion value */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    Average Conversion Value 
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" title="The commercial revenue attributed to a single guest reservation or click action." />
                  </span>
                  <span className="text-indigo-650 dark:text-indigo-400 font-mono font-bold">${averageBookingValue}</span>
                </div>
                
                <input 
                  type="range" 
                  min="50" 
                  max="1500" 
                  step="25" 
                  value={averageBookingValue} 
                  onChange={(e) => setAverageBookingValue(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[8px] text-slate-400 uppercase font-mono font-bold">
                  <span>$50 (Bistro Menu)</span>
                  <span>$750 (Suite Booking)</span>
                  <span>$1500 (Penthouse)</span>
                </div>
              </div>

              {/* Selector 2: Conversion Multi-Touch Attribution Model */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Multi-Touch Social Attribution Weights
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  
                  <button
                    onClick={() => setAttributionModel('linear')}
                    className={`p-2.5 rounded-sm border text-left transition relative cursor-pointer ${
                      attributionModel === 'linear' 
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 text-slate-900 dark:text-white font-bold' 
                        : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="block text-[8px] font-black uppercase text-slate-450 tracking-wider font-mono">Linear (Equal)</span>
                    <span className="text-[10px]">25% evenly allocated</span>
                    {attributionModel === 'linear' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                  </button>

                  <button
                    onClick={() => setAttributionModel('first-click')}
                    className={`p-2.5 rounded-sm border text-left transition relative cursor-pointer ${
                      attributionModel === 'first-click' 
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 text-slate-900 dark:text-white font-bold' 
                        : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="block text-[8px] font-black uppercase text-slate-450 tracking-wider font-mono">First Click</span>
                    <span className="text-[10px]">Attributed upper funnel</span>
                    {attributionModel === 'first-click' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                  </button>

                  <button
                    onClick={() => setAttributionModel('last-click')}
                    className={`p-2.5 rounded-sm border text-left transition relative cursor-pointer ${
                      attributionModel === 'last-click' 
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 text-slate-900 dark:text-white font-bold' 
                        : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="block text-[8px] font-black uppercase text-slate-450 tracking-wider font-mono">Last Touch</span>
                    <span className="text-[10px]">Attributed bottom conversion</span>
                    {attributionModel === 'last-click' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                  </button>

                  <button
                    onClick={() => setAttributionModel('u-shaped')}
                    className={`p-2.5 rounded-sm border text-left transition relative cursor-pointer ${
                      attributionModel === 'u-shaped' 
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 text-slate-900 dark:text-white font-bold' 
                        : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="block text-[8px] font-black uppercase text-slate-450 tracking-wider font-mono">U-Shaped (40-20-40)</span>
                    <span className="text-[10px]">Initial & closing biased</span>
                    {attributionModel === 'u-shaped' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                  </button>

                </div>
              </div>

              {/* Selector 3: Active Campaign Focus Filter */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Target Google Ads Campaign Focus
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => { setSelectedCampaignId(e.target.value); }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white p-2.5 text-xs outline-none focus:border-indigo-500 rounded-sm"
                >
                  <option value="all">📊 All Live Active Google Ads Campaigns</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.status === 'paused' ? '(Paused)' : ''}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Secure Trust Stamp */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-sm border border-slate-100 dark:border-slate-850/80 mt-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white text-[10px] font-bold font-mono">
              <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>TLS SECURITIES OK</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal font-sans">
              Google Ads OAuth scope relies on isolated TLS 1.3 containers. Disconnecting active tokens sweeps localized buffers instantly.
            </p>
          </div>

        </div>

        {/* Right Column (7 cols): Relationship correlation chart & allocation breakdown */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-205 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-indigo-550" />
                <div>
                  <h3 className="text-xs uppercase font-black text-slate-810 dark:text-white tracking-wider">Correlation Matrix & Spatial Trends</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Google Ads daily budget influence against organic social networks conversions.</p>
                </div>
              </div>

              <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2.5 py-1 rounded-sm font-mono">
                Temporal Line
              </span>
            </div>

            {/* Recharts Temporal correlation plotting */}
            <div className="h-60 mt-4 select-text">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={correlationTimeline} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} fontStyle="italic" />
                  <YAxis yAxisId="left" stroke="#4f46e5" fontSize={9} />
                  <YAxis yAxisId="right" orientation="right" stroke="#e11d48" fontSize={9} />
                  
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '11px', color: '#fff' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                  
                  {/* Left Axis: Google Ads Spend */}
                  <Bar yAxisId="left" dataKey="adSpend" fill="#4f46e5" fillOpacity={0.25} stroke="#4f46e5" strokeWidth={1} name="Google Ads Spend ($)" radius={[1, 1, 0, 0]} />
                  
                  {/* Right Axis: Social platform-attributed conversions */}
                  <Line yAxisId="right" type="monotone" dataKey="instagramConv" stroke="#f43f5e" strokeWidth={2.5} name="Instagram Conversions" dot={{ r: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="facebookConv" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" name="Facebook Conversions" dot={{ r: 1 }} />
                  <Line yAxisId="right" type="monotone" dataKey="tiktokConv" stroke="#8b5cf6" strokeWidth={2} name="TikTok Conversions" dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-slate-850/80 text-center font-sans">
            <div>
              <span className="block text-[8px] uppercase text-slate-400 font-bold">Overall CTR</span>
              <span className="block text-xs font-mono font-black text-slate-800 dark:text-white mt-0.5">{dynamicCalculations.overallCtr.toFixed(2)}%</span>
            </div>
            <div className="border-l border-slate-100 dark:border-slate-800">
              <span className="block text-[8px] uppercase text-slate-400 font-bold">Average CPC</span>
              <span className="block text-xs font-mono font-black text-emerald-600 mt-0.5">${dynamicCalculations.overallCpc.toFixed(2)}</span>
            </div>
            <div className="border-l border-slate-100 dark:border-slate-800">
              <span className="block text-[8px] uppercase text-slate-400 font-bold">Allocated Conversions</span>
              <span className="block text-xs font-mono font-black text-slate-800 dark:text-white mt-0.5">{dynamicCalculations.totalConversions}</span>
            </div>
            <div className="border-l border-slate-100 dark:border-slate-800">
              <span className="block text-[8px] uppercase text-slate-400 font-bold">Simulated Multiplier</span>
              <span className="block text-xs font-mono font-black text-indigo-550 mt-0.5">{attributionModel.toUpperCase()}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Campaign Performance matrices table ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-sm shadow-xs p-5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Table className="w-4.5 h-4.5 text-indigo-550" />
            <div>
              <h3 className="text-xs uppercase font-black text-slate-850 dark:text-white tracking-wider">Campaign Performance Matrix Ledger</h3>
              <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-0.5">Real-time budget allocation adjustments, conversions rates, and targeted automated ROAS projections.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-sm">
            <span className="text-slate-500 uppercase font-black font-mono">Attribution Weight Bias:</span>
            <span className="text-indigo-600 font-extrabold uppercase font-mono">{attributionModel} Mode</span>
          </div>
        </div>

        {/* Dynamic Table Layout */}
        <div className="overflow-x-auto select-all pr-1">
          <table className="w-full text-left font-sans text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-150 dark:border-slate-800/80 text-[10px] uppercase text-slate-400 font-black tracking-wider">
                <th className="py-2.5">Campaign Details</th>
                <th className="py-2.5">Platform</th>
                <th className="py-2.5 text-right">Ad Spend ($)</th>
                <th className="py-2.5 text-right">Traffic Clicks</th>
                <th className="py-2.5 text-right">Impressions</th>
                <th className="py-2.5 text-center">CTR (%)</th>
                <th className="py-2.5 text-right">CPC ($)</th>
                <th className="py-2.5 text-right">Conversions</th>
                <th className="py-2.5 text-right">Allocated Revenues ($)</th>
                <th className="py-2.5 text-center">Calculated ROAS</th>
                <th className="py-2.5 text-center">Remote Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {campaigns.map(c => {
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0';
                const cpc = c.clicks > 0 ? (c.spend / c.clicks).toFixed(2) : '0';
                
                // Conversions modeling for single rows
                let ratio = 0.25;
                if (c.id === 'c_luxury_villa') ratio = 0.35;
                if (c.id === 'c_gourmet_tasting') ratio = 0.28;
                if (c.id === 'c_retreat_couples') ratio = 0.22;
                if (c.id === 'c_membership_club') ratio = 0.15;
                
                const conversions = c.status === 'active' 
                  ? Math.round(dynamicCalculations.totalConversions * ratio) 
                  : 0;
                const allocationRev = conversions * averageBookingValue;
                const roas = c.status === 'active' && c.spend > 0 
                  ? (allocationRev / c.spend).toFixed(2) 
                  : '0.00';

                return (
                  <tr 
                    key={c.id} 
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition ${
                      c.status === 'paused' ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      <div>
                        <span className="block">{c.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">{c.id.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold uppercase text-slate-500 font-mono">Google Ads Platform</span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold">${c.spend.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono">{c.clicks.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono text-slate-405">{c.impressions.toLocaleString()}</td>
                    <td className="py-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{ctr}%</td>
                    <td className="py-3 text-right font-mono hover:underline text-emerald-600">${cpc}</td>
                    <td className="py-3 text-right font-mono font-black text-slate-805 dark:text-white">{conversions}</td>
                    <td className="py-3 text-right font-mono font-semibold text-emerald-650">${allocationRev.toLocaleString()}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] font-black ${
                        Number(roas) >= 4.0 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : Number(roas) > 1.5 
                            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' 
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {roas}x
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-sans">
                        <button
                          onClick={() => handleBoostBid(c.id)}
                          disabled={c.status === 'paused'}
                          className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-40 text-[9px] font-black rounded-xs transition uppercase tracking-wide cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="w-2.5 h-2.5 text-indigo-600 animate-pulse" /> +15% Bid
                        </button>
                        <button
                          onClick={() => toggleCampaignState(c.id)}
                          className={`px-2 py-1 border text-[9px] font-black rounded-xs transition uppercase cursor-pointer ${
                            c.status === 'active' 
                              ? 'border-slate-205 dark:border-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-400' 
                              : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                          }`}
                        >
                          {c.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
