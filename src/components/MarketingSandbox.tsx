import React, { useState } from 'react';
import { 
  Instagram, 
  Linkedin, 
  Video, 
  Sparkles, 
  Settings, 
  Send, 
  CheckCircle2, 
  Smartphone, 
  Users, 
  MessageCircle, 
  Heart, 
  Share2, 
  Clock, 
  Workflow
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Template {
  id: string;
  name: string;
  category: string;
  caption: string;
  bgUrl: string;
}

const LUXURY_TEMPLATES: Template[] = [
  {
    id: 't_resort',
    name: 'Infinity Paradise',
    category: 'Estate & Resort',
    caption: '🌴 Ultimate coastal tranquility awaits. Experience panoramic ocean vistas, temperature-regulated infinity channels, and custom 5-star room service. Strict luxury tier reservations now open.',
    bgUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600'
  },
  {
    id: 't_bistro',
    name: 'Sommelier Night',
    category: 'Fine Dining',
    caption: '🍷 Immerse yourself in authentic gourmet craftsmanship. Tonight at Le Bistro, enjoy dry-aged premium tenderloin cuts coupled with exclusive 1998 reserve file vintages. Call to reserve a quiet dining alcove.',
    bgUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'
  },
  {
    id: 't_real',
    name: 'Sunset Terraces',
    category: 'Elite Real Estate',
    caption: '🏡 Apex Elite is thrilled to announce private viewings for the Sunset Vista Residences. Architectural masterpieces pairing geometric ceilings with sustainable concrete materials. Inquire directly.',
    bgUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600'
  }
];

export default function MarketingSandbox() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(LUXURY_TEMPLATES[0]);
  const [customCaption, setCustomCaption] = useState<string>(LUXURY_TEMPLATES[0].caption);
  const [platforms, setPlatforms] = useState({
    instagram: true,
    tiktok: false,
    linkedin: true
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSteps, setSimSteps] = useState<string[]>([]);
  const [simSuccess, setSimSuccess] = useState(false);

  const togglePlatform = (p: 'instagram' | 'tiktok' | 'linkedin') => {
    setPlatforms(prev => ({ ...prev, [p]: !prev[p] }));
  };

  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setCustomCaption(t.caption);
    setSimSuccess(false);
    setSimSteps([]);
  };

  const triggerSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimSuccess(false);
    setSimSteps([]);

    const steps = [
      'Establishing TLS-secured protocol link to platform APIs...',
      'Synthesizing generative visual frames with custom tags...',
      'Injecting isolated PKCE authentication tokens...',
      'Handshake complete! Campaign synchronized successfully.'
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setSimSteps(prev => [...prev, steps[current]]);
        current++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setSimSuccess(true);
      }
    }, 900);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Intro copy */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/30 px-3 py-1 rounded-sm text-[10px] font-extrabold uppercase font-mono tracking-wider">
            <Smartphone className="w-3.5 h-3.5" />
            Interactive Campaign Simulator
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-905 dark:text-white uppercase">
            Test Drive The Multi-Platform Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            See how the simultaneous broadcast architecture shapes and delivers content instantly. Select a brand preset below, edit the text template, toggle destination targets, and simulate a real-time dispatch sequence.
          </p>
        </div>

        {/* Workspace Mockup Card */}
        <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-sm shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left panel (6 cols): Controller & inputs */}
          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-150 dark:border-slate-800 space-y-6">
            
            {/* Step 1: Presets */}
            <div className="space-y-2">
              <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">
                1. Select Brand Content Template
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {LUXURY_TEMPLATES.map(t => {
                  const isSel = selectedTemplate.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className={`text-left p-3 rounded-sm border transition text-xs relative cursor-pointer ${
                        isSel 
                          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 text-slate-950 dark:text-white font-bold' 
                          : 'border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-mono mb-0.5">{t.category}</span>
                      <span className="line-clamp-1">{t.name}</span>
                      {isSel && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Target channels check */}
            <div className="space-y-2">
              <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">
                2. Target Broadcast Destinations
              </span>
              <div className="flex flex-wrap gap-3">
                
                {/* IG */}
                <button
                  onClick={() => togglePlatform('instagram')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs cursor-pointer select-none transition ${
                    platforms.instagram 
                      ? 'bg-pink-500/10 border-pink-500/40 text-pink-700 dark:text-pink-400 font-bold' 
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-slate-405 dark:text-slate-500'
                  }`}
                >
                  <Instagram className={`w-4 h-4 ${platforms.instagram ? 'text-pink-500' : ''}`} />
                  Instagram Feed
                </button>

                {/* TT */}
                <button
                  onClick={() => togglePlatform('tiktok')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs cursor-pointer select-none transition ${
                    platforms.tiktok 
                      ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-400 font-bold' 
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-slate-405 dark:text-slate-500'
                  }`}
                >
                  <Video className={`w-4 h-4 ${platforms.tiktok ? 'text-purple-500' : ''}`} />
                  TikTok Video
                </button>

                {/* LI */}
                <button
                  onClick={() => togglePlatform('linkedin')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs cursor-pointer select-none transition ${
                    platforms.linkedin 
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-400 font-bold' 
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-slate-405 dark:text-slate-500'
                  }`}
                >
                  <Linkedin className={`w-4 h-4 ${platforms.linkedin ? 'text-blue-600' : ''}`} />
                  LinkedIn Corp
                </button>

              </div>
            </div>

            {/* Step 3: Editor */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase font-black text-slate-400 tracking-wider">
                <span>3. Live Caption Studio Editor</span>
                <span className="font-mono text-slate-450">{customCaption.length} characters</span>
              </div>
              
              <div className="relative">
                <textarea
                  value={customCaption}
                  onChange={(e) => { setCustomCaption(e.target.value); setSimSuccess(false); }}
                  placeholder="Draft your promotional text message here..."
                  className="w-full h-32 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none font-sans leading-relaxed"
                />
                <div className="absolute right-2 bottom-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-sm flex items-center gap-1 text-[9px] text-slate-400">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Gemini Enhanced Draft
                </div>
              </div>
            </div>

            {/* Step 4: Dispatch Simulator */}
            <div className="space-y-3 pt-2">
              <button
                onClick={triggerSimulation}
                disabled={isSimulating || (!platforms.instagram && !platforms.tiktok && !platforms.linkedin)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs py-3 rounded-sm cursor-pointer shadow-md transition flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {isSimulating ? (
                  <>
                    <Workflow className="w-4 h-4 animate-spin" />
                    Executing Secure Token Handshake...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Simulate Instant Simultaneous Dispatch
                  </>
                )}
              </button>

              {/* Progress Stepper logs */}
              {(isSimulating || simSteps.length > 0) && (
                <div className="bg-slate-950 text-slate-300 p-3.5 rounded-sm font-mono text-[10px] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-slate-550 border-b border-slate-900 pb-1.5 uppercase font-bold tracking-wider">
                    <span>SOCIALPILOT SAAS DISPATCH NODE LOGS</span>
                    <span className="text-indigo-400 font-black">STABLE_CONNECT</span>
                  </div>
                  
                  {simSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 animate-fade-in text-slate-300">
                      <span className="text-indigo-500 font-extrabold">✓</span>
                      <span>{step}</span>
                    </div>
                  ))}

                  {isSimulating && (
                    <div className="flex items-center gap-1.5 text-slate-450 italic animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                      <span>Pushing content arrays downstream...</span>
                    </div>
                  )}

                  {simSuccess && (
                    <div className="pt-2 text-emerald-400 font-extrabold flex items-center gap-1.5 text-[10px] animate-bounce">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>DISPATCH COMPLETED: Broadcaster uploaded packet securely (SOC2 Compliant)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right panel (5 cols): Dynamic Smart Preview screen mockup frame */}
          <div className="lg:col-span-5 bg-slate-900/10 dark:bg-slate-950/40 p-6 flex flex-col justify-center items-center relative overflow-hidden min-h-[460px]">
            {/* Background geometric grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
            
            <span className="absolute top-4 left-4 text-[9px] uppercase font-mono font-bold tracking-widest text-slate-450 block z-10">
              Live Mockup Preview Frame
            </span>

            {/* PREVIEW CONTAINER */}
            <div className="relative w-full max-w-[280px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-205 dark:border-slate-800 overflow-hidden z-10 transition">
              
              {/* Phone Status bar */}
              <div className="h-5 bg-slate-100 dark:bg-slate-950 px-4 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>09:41 AM</span>
                <span className="text-[10px] text-emerald-450 font-bold">&#9679; 5G</span>
              </div>

              {/* Dynamic Platform Layout */}
              {/* IF NONE SELECTED */}
              {!platforms.instagram && !platforms.tiktok && !platforms.linkedin ? (
                <div className="p-8 text-center text-slate-400 h-64 flex flex-col justify-center items-center font-sans space-y-2">
                  <Smartphone className="w-10 h-10 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="text-[10px] leading-normal">Select at least one broadcast target to render live preview frames.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  
                  {/* INSTAGRAM PORTION IF TRUE */}
                  {platforms.instagram && (
                    <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=50" 
                            alt="avatar" 
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-800" 
                          />
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-900 dark:text-white block leading-tight">lusso_resorts</span>
                            <span className="text-[8px] text-slate-400 leading-none">Sponsored • Instagram</span>
                          </div>
                        </div>
                        <Instagram className="w-3.5 h-3.5 text-pink-500" />
                      </div>

                      {/* Mockup Image */}
                      <div className="relative aspect-video w-full rounded overflow-hidden bg-slate-100 border border-slate-200/50 dark:border-slate-850">
                        <img 
                          src={selectedTemplate.bgUrl} 
                          alt="preview" 
                          className="object-cover w-full h-full" 
                        />
                      </div>

                      {/* Caption text */}
                      <div className="space-y-1 font-sans text-[10px]">
                        <p className="text-slate-800 dark:text-slate-350 leading-relaxed text-left shrink-0 line-clamp-3">
                          <strong className="text-slate-900 dark:text-white mr-1">lusso_resorts</strong>
                          {customCaption}
                        </p>
                        <span className="text-[8px] text-indigo-500 font-bold block">#luxuryresort #vacation #travel #brandpilot</span>
                      </div>

                      {/* Interactive mock stats */}
                      <div className="flex items-center gap-4 text-slate-400 text-[10px] pt-1.5 border-t border-slate-105/50">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> 1,420</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> 84</span>
                      </div>
                    </div>
                  )}

                  {/* TIKTOK PORTION IF TRUE */}
                  {platforms.tiktok && (
                    <div className="p-4 space-y-3 bg-slate-950 text-white relative">
                      <div className="absolute top-2 right-2 bg-black/60 p-1 rounded">
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                      </div>

                      <div className="flex items-center gap-2">
                        <img 
                          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50" 
                          alt="avatar" 
                          className="w-6 h-6 rounded-full object-cover border border-slate-800" 
                        />
                        <div>
                          <span className="text-[10px] font-extrabold text-white block leading-tight">lusso_vacations</span>
                          <span className="text-[8px] text-slate-400 leading-none">TikTok Creator</span>
                        </div>
                      </div>

                      {/* Video wrapper */}
                      <div className="relative aspect-video w-full rounded overflow-hidden bg-slate-900 border border-slate-850">
                        <img 
                          src={selectedTemplate.bgUrl} 
                          alt="preview" 
                          className="object-cover w-full h-full brightness-75" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
                            <span className="text-white text-xs pl-0.5">▶</span>
                          </div>
                        </div>
                      </div>

                      {/* Caption text */}
                      <div className="space-y-1 text-left font-sans text-[10px]">
                        <p className="text-slate-300 leading-normal line-clamp-2">
                          <strong className="text-white mr-1">@lusso_vacations</strong>
                          {customCaption}
                        </p>
                        <span className="text-[8.5px] text-cyan-400 font-mono">♬ Original Sound - Lusso Vacations Audio</span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-slate-400 text-[10px] pt-1">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> 12K</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-white" /> 2,340</span>
                      </div>
                    </div>
                  )}

                  {/* LINKEDIN PORTION IF TRUE */}
                  {platforms.linkedin && (
                    <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img 
                            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=50" 
                            alt="avatar" 
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-800" 
                          />
                          <div>
                            <span className="text-[9.5px] font-extrabold text-slate-900 dark:text-white block leading-tight">Lusso Hospitality Corp</span>
                            <span className="text-[7.5px] text-slate-400 leading-none">12,504 followers • Shared Publicly</span>
                          </div>
                        </div>
                        <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                      </div>

                      {/* Text caption */}
                      <p className="text-[9.5px] text-slate-800 dark:text-slate-350 leading-relaxed text-left line-clamp-3">
                        {customCaption}
                      </p>

                      {/* Mockup card */}
                      <div className="border border-slate-150 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 overflow-hidden">
                        <img 
                          src={selectedTemplate.bgUrl} 
                          alt="preview" 
                          className="object-cover w-full h-24" 
                        />
                        <div className="p-2 text-left bg-slate-100/50 dark:bg-slate-950">
                          <span className="text-[9px] font-bold text-slate-900 dark:text-white block">Official Booking Portals</span>
                          <span className="text-[8px] text-slate-400 block leading-none">lusso.org/explore-sanctuaries</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-slate-400 text-[8.5px] pt-1.5 border-t border-slate-105/50">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-blue-500 fill-blue-500" /> 210 Likes</span>
                        <span>14 Comments</span>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
