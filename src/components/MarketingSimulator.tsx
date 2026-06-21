import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Coins, 
  Sparkles, 
  ArrowUpRight, 
  Layers, 
  Sliders, 
  HelpCircle,
  Flame,
  Volume2,
  RefreshCw,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import confetti from 'canvas-confetti';

export default function MarketingSimulator() {
  // Input Controls
  const [adSpend, setAdSpend] = useState<number>(3500);
  const [convRate, setConvRate] = useState<number>(2.5); // %
  const [avgBooking, setAvgBooking] = useState<number>(450); // $
  const [channelMix, setChannelMix] = useState<'multi' | 'instagram' | 'tiktok' | 'linkedin' | 'facebook'>('multi');
  
  // "Extreme mode" virality multiplier state!
  const [extremeMode, setExtremeMode] = useState<boolean>(false);

  // Trigger high impact visual confetti when activating Extreme Mode
  const handleExtremeToggle = () => {
    const nextVal = !extremeMode;
    setExtremeMode(nextVal);
    if (nextVal) {
      // Trigger multiple bursts of premium colorful confetti
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  };

  // Perform dynamic math calculations for projections
  const projections = useMemo(() => {
    // Platform modifiers
    let reachMultiplier = 1.0;
    let cpcRate = 0.45; // average cost per click

    switch (channelMix) {
      case 'instagram':
        reachMultiplier = 1.15;
        cpcRate = 0.38;
        break;
      case 'tiktok':
        reachMultiplier = 1.40; // TikTok has much wider organic reach
        cpcRate = 0.32;
        break;
      case 'linkedin':
        reachMultiplier = 0.75; // low mass reach but ultra targeted
        cpcRate = 1.20; // high CPC
        break;
      case 'facebook':
        reachMultiplier = 0.95;
        cpcRate = 0.48;
        break;
      case 'multi':
      default:
        reachMultiplier = 1.1;
        cpcRate = 0.45;
        break;
    }

    // Virality boost factor
    const viralityMultiplier = extremeMode ? 2.5 : 1.0;

    // Derived values
    const estimatedClicks = Math.round((adSpend / cpcRate) * reachMultiplier * viralityMultiplier);
    const projectedConversions = Math.round((estimatedClicks * (convRate / 100)) * viralityMultiplier);
    const estimatedRevenue = Math.round(projectedConversions * avgBooking);
    const computedRoas = adSpend > 0 ? Number((estimatedRevenue / adSpend).toFixed(2)) : 0;
    const estimatedProfit = Math.max(0, estimatedRevenue - adSpend);
    const profitMargin = estimatedRevenue > 0 ? Number(((estimatedProfit / estimatedRevenue) * 100).toFixed(1)) : 0;
    const cpa = projectedConversions > 0 ? Number((adSpend / projectedConversions).toFixed(2)) : 0;

    // Generate 6-month ramp up timeline projections for plotting
    const timelineData = Array.from({ length: 6 }).map((_, i) => {
      const monthNum = i + 1;
      // Exponential ramp up coefficient simulating learning curve of ad platform algorithms
      const rampUp = 0.4 + (i * 0.15) + (extremeMode ? 0.3 : 0);
      const factor = Math.min(1.4, rampUp);

      const mSpend = Math.round(adSpend * (0.8 + (i * 0.1))); // slightly increasing spend
      const mClicks = Math.round((mSpend / cpcRate) * reachMultiplier * viralityMultiplier * factor);
      const mConvs = Math.round((mClicks * (convRate / 100)) * viralityMultiplier);
      const mRev = Math.round(mConvs * avgBooking);

      return {
        month: `Month ${monthNum}`,
        'Ad Spend': mSpend,
        'Projected Revenue': mRev,
        'Estimated Net Profit': Math.max(0, mRev - mSpend)
      };
    });

    // Custom heuristic AI suggestion generator based on current metrics
    let aiAdvice = '';
    if (computedRoas < 1.5) {
      aiAdvice = '🚨 WARNING: High customer onboarding costs detected. Your current ad set could yield low returns. Boost your Booking Value rates or prioritize conversion optimization immediately.';
    } else if (computedRoas >= 1.5 && computedRoas < 3.5) {
      aiAdvice = '👍 HEALTHY SCALE: Stable return patterns. We recommend shifting 20% budget towards TikTok and Reel channels to expand your organic reach coefficients.';
    } else if (computedRoas >= 3.5 && computedRoas < 6.0) {
      aiAdvice = '🔥 HYPER PROFITABLE: Exceptional performance indicators. Authorize additional social pilot integrations to maintain publishing frequency and secure your guest calendar vacancies!';
    } else {
      aiAdvice = '👑 LEGENDARY VIRALITY: Extreme margin efficiency! Your ad assets are generating self-sustaining compound reach. Scale budget aggressively to corner regional luxury holiday search markets!';
    }

    return {
      estimatedClicks,
      projectedConversions,
      estimatedRevenue,
      computedRoas,
      estimatedProfit,
      profitMargin,
      cpa,
      timelineData,
      aiAdvice,
      cpcRate
    };
  }, [adSpend, convRate, avgBooking, channelMix, extremeMode]);

  return (
    <div id="marketing-simulator-panel" className="bg-white dark:bg-slate-900 rounded-sm border border-slate-205 dark:border-slate-800 p-5 shadow-sm transition space-y-6">
      
      {/* Promotional Top Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-rose-500/10 text-rose-500 rounded-sm text-[9px] font-black uppercase tracking-wider font-mono flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 text-rose-500" /> EXTREME PERFORMANCE
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">SIMULATION MATRIX v2.0</span>
          </div>
          <h3 className="text-sm font-black text-slate-905 dark:text-white uppercase tracking-wider font-display mt-1">Cross-Channel ROI Projection Studio</h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Simulate growth velocity, channel distributions, and revenue yields under high brand traction conditions.</p>
        </div>

        {/* Extreme Mode Switch button with visual flame indicator */}
        <button
          onClick={handleExtremeToggle}
          className={`px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest transition duration-300 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 font-mono border ${
            extremeMode 
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Flame className={`w-4.5 h-4.5 ${extremeMode ? 'animate-bounce text-yellow-300' : 'text-slate-400'}`} />
          {extremeMode ? '⚡ EXTREME MODE: ON' : 'ACTIVATE EXTREME MODE'}
        </button>
      </div>

      {/* Main Grid: Left inputs sidebar vs Right graphs/KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Inputs (4 columns) */}
        <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-sm border border-slate-100 dark:border-slate-850/80 space-y-5">
          
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
            <Sliders className="w-4 h-4 text-indigo-550" />
            <span>Operational Adjusters</span>
          </div>

          {/* Ad Spend Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-bold">Monthly Ad Allocation:</span>
              <span className="text-indigo-650 dark:text-indigo-400 font-mono font-black">${adSpend.toLocaleString()}</span>
            </div>
            <input 
              type="range"
              min="200"
              max="25000"
              step="200"
              value={adSpend}
              onChange={(e) => setAdSpend(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-mono">
              <span>$200 / mo</span>
              <span>$12k scaled</span>
              <span>$25k corporate</span>
            </div>
          </div>

          {/* Booking Rate Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-bold">Avg Accommodation Stay:</span>
              <span className="text-indigo-650 dark:text-indigo-400 font-mono font-black">${avgBooking}</span>
            </div>
            <input 
              type="range"
              min="50"
              max="3000"
              step="50"
              value={avgBooking}
              onChange={(e) => setAvgBooking(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-mono">
              <span>$50 bistro</span>
              <span>$1k suite stay</span>
              <span>$3k penthouse</span>
            </div>
          </div>

          {/* Conversion Rate Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-bold">Funnel Conversion Index:</span>
              <span className="text-indigo-650 dark:text-indigo-400 font-mono font-black">{convRate}%</span>
            </div>
            <input 
              type="range"
              min="0.2"
              max="15.0"
              step="0.1"
              value={convRate}
              onChange={(e) => setConvRate(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-mono">
              <span>0.2% raw baseline</span>
              <span>7.5% optimized</span>
              <span>15% hyper funnel</span>
            </div>
          </div>

          {/* Channel Prioritization */}
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-600 dark:text-slate-400 font-bold">Target Channel Mix Priority:</label>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {[
                { id: 'multi', label: 'Balanced (Multi)' },
                { id: 'instagram', label: 'Instagram (Reels)' },
                { id: 'tiktok', label: 'TikTok (Organic)' },
                { id: 'linkedin', label: 'LinkedIn (B2B)' },
                { id: 'facebook', label: 'Facebook (Meta)' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setChannelMix(c.id as any)}
                  className={`p-2 border text-left rounded-sm font-semibold transition ${
                    channelMix === c.id 
                      ? 'border-indigo-600 bg-indigo-50/15 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Derived Metrics block */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-sm p-3 space-y-1.5 font-mono text-[9px] text-slate-500">
            <div className="flex justify-between">
              <span>Platform Estimated CPC:</span>
              <strong className="text-slate-800 dark:text-white">${projections.cpcRate.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Estimated Web Clicks:</span>
              <strong className="text-slate-800 dark:text-white">{projections.estimatedClicks.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span>Virality Boost Factor:</span>
              <strong className={extremeMode ? 'text-rose-500 font-black' : 'text-slate-450'}>
                {extremeMode ? '250%' : '100% (Standard)'}
              </strong>
            </div>
          </div>

        </div>

        {/* Right Output Dashboard (8 columns) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
          
          {/* Numerical Projections KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Projected Revenue */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-4 rounded-sm hover:border-slate-300 transition">
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Projected Yield</span>
              <span className="block font-mono text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ${projections.estimatedRevenue.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block mt-1">Estimated Return Value</span>
            </div>

            {/* Simulated ROI Ratio */}
            <div className={`border p-4 rounded-sm transition ${
              extremeMode 
                ? 'bg-orange-500/10 border-orange-500/30' 
                : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800 hover:border-slate-300'
            }`}>
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Projected ROAS</span>
              <span className={`block font-mono text-xl md:text-2xl font-black mt-1 ${
                extremeMode ? 'text-orange-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                {projections.computedRoas}x
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block mt-1">Return factor multiple</span>
            </div>

            {/* Projected Conversions */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-4 rounded-sm hover:border-slate-300 transition">
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Reservations Cap</span>
              <span className="block font-mono text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
                {projections.projectedConversions}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block mt-1">Acquisitions qty</span>
            </div>

            {/* Mode status */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-4 rounded-sm hover:border-slate-300 transition">
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Funnel CPA Limit</span>
              <span className="block font-mono text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
                ${projections.cpa}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-550 block mt-1">Cost-per-booking average</span>
            </div>

          </div>

          {/* Interactive timeline growth trend Recharts AreaChart */}
          <div className="border border-slate-150 dark:border-slate-800 rounded-sm p-4 bg-slate-50/40 dark:bg-slate-950/40">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider font-mono">6-Month Automated Scale Curve</span>
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-450 font-mono">Learning efficiency simulated</span>
            </div>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projections.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfitSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpendSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '11px', color: '#fff' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="Projected Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfitSim)" name="Projected Revenue ($)" />
                  <Area type="monotone" dataKey="Ad Spend" stroke="#4f46e5" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSpendSim)" name="Ad Spend Allocation ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heuristic Social AI advice notification box */}
          <div className={`p-3.5 rounded-sm border text-xs leading-relaxed flex items-start gap-2 ${
            extremeMode 
              ? 'bg-amber-500/10 border-amber-500/20 text-slate-800 dark:text-amber-200' 
              : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            <Sparkles className={`w-4 h-4 shrink-0 ${extremeMode ? 'text-amber-500 animate-spin' : 'text-indigo-500'}`} />
            <div>
              <span className="font-extrabold uppercase text-[9px] tracking-widest block text-indigo-650 dark:text-indigo-400 mb-0.5">Real-time Simulation Insight:</span>
              <p className="text-[11px] leading-relaxed">{projections.aiAdvice}</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
