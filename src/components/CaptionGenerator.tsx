/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Check, Edit3, Calendar, RotateCcw, Copy, AlertCircle } from 'lucide-react';
import { PlatformType, CtaType } from '../types';

interface CaptionGeneratorProps {
  workspaceId: string;
  onPostScheduled: () => void;
}

export default function CaptionGenerator({ workspaceId, onPostScheduled }: CaptionGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('instagram');
  const [tone, setTone] = useState('Professional & Elegant');
  const [cta, setCta] = useState<CtaType>('None');
  
  // Generation output state
  const [isGenerating, setIsGenerating] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [ctas, setCtas] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Schedule state
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    
    setIsGenerating(true);
    setCaption('');
    setHashtags('');
    setCtas([]);

    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          platform,
          tone,
          cta
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCaption(data.caption || '');
        setHashtags(data.hashtags || '');
        setCtas(data.ctas || ['Learn More', 'Reserve Now']);
        setCampaignTitle(`AI Campaign ${platform}`);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (e: any) {
      console.error(e);
      setCaption(`Error generating content: ${e.message}. Please verify the server is running on port 3000.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const fullText = `${caption}\n\n${hashtags}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle || !scheduleTime) return;

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: campaignTitle,
          description: `${caption}\n\n${hashtags}`,
          platforms: [platform],
          cta: cta,
          publish_date: new Date(scheduleTime).toISOString(),
          ai_generated: true
        })
      });

      if (res.ok) {
        alert('Campaign scheduled onto your social calendar successfully!');
        setIsScheduling(false);
        setPrompt('');
        setCaption('');
        setHashtags('');
        onPostScheduled();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="caption-generator" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Parameters Panel */}
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wider">AI Caption Studio</h3>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 text-xs font-semibold text-slate-600">
          <div>
            <label className="block mb-1.5 text-slate-600">Describe Your Image / Campaign Topic</label>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Introducing our new infinity swimming pool at Lusso Spa Resort showing gorgeous sunset ocean horizons. Highlight luxury, peace and romantic getaways."
              className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition font-sans text-xs"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-slate-600">Target Social Network</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition capitalize"
              >
                <option value="instagram">Instagram Grid/Reels</option>
                <option value="facebook">Facebook Feed</option>
                <option value="twitter">X / Twitter Post</option>
                <option value="linkedin">LinkedIn Article</option>
                <option value="tiktok">TikTok Video caption</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-slate-600">Brand Tone & Voice</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition"
              >
                <option value="Professional & Elegant">Professional & Elegant</option>
                <option value="Casual & Sarcastic">Casual & Sarcastic</option>
                <option value="Bold and High-Converting">Bold and High-Converting</option>
                <option value="Playful & Fun">Playful & Fun</option>
                <option value="Deeply Inspiring & Authentic">Deeply Inspiring & Authentic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-600">Call-To-Action Element suggestion</label>
            <select
              value={cta}
              onChange={(e) => setCta(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition"
            >
              <option value="None">None (General Awareness)</option>
              <option value="Book Now">Book Now</option>
              <option value="Learn More">Learn More</option>
              <option value="Contact Us">Contact Us</option>
              <option value="Reserve Now">Reserve Now</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className={`w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              isGenerating ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Drafting content with Gemini...' : 'Generate Caption with AI'}
          </button>
        </form>
      </div>

      {/* Output Panel */}
      <div className="bg-slate-50 p-6 rounded-sm border border-slate-200 flex flex-col justify-between min-h-[380px]">
        {caption ? (
          <div className="space-y-4 flex-1 flex flex-col justify-between font-sans">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-[10px] bg-slate-250 px-2 py-0.5 rounded-sm font-extrabold uppercase tracking-widest text-slate-700">{platform} Post preview</span>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-slate-200 rounded-sm text-slate-600 transition cursor-pointer"
                    title="Copy full text"
                  >
                    {copied ? <span className="text-[10px] font-bold text-emerald-600">Copied!</span> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setCaption(''); setHashtags(''); }}
                    className="p-1.5 hover:bg-slate-200 rounded-sm text-slate-600 transition cursor-pointer"
                    title="Reset studio"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Output Box */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Generated Caption Copy (Editable)</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  className="w-full bg-white border border-slate-200 p-3 rounded-sm text-xs leading-relaxed text-slate-800 outline-none focus:border-slate-400 transition font-sans"
                ></textarea>
              </div>

              {/* Hashtags Segment */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Trending Hashtags (Editable)</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-sm text-xs text-indigo-700 outline-none focus:border-slate-400 transition font-mono"
                />
              </div>

              {/* Action Suggestion Feed */}
              {ctas.length > 0 && (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Alternative Call To Actions recommended:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ctas.map((c, i) => (
                      <span key={i} className="bg-indigo-50/70 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-sm text-[10px] font-bold">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scheduling Action box */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              {!isScheduling ? (
                <button
                  onClick={() => setIsScheduling(true)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Calendar className="w-4 h-4" /> Save and Schedule this Caption
                </button>
              ) : (
                <form onSubmit={handleSchedulePost} className="space-y-3 bg-white p-4 border border-slate-200 rounded-sm text-xs">
                  <div className="font-bold text-slate-700 font-sans uppercase tracking-tight">Configure Campaign Lock-in</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-slate-500">Campaign Title</label>
                      <input
                        type="text"
                        required
                        value={campaignTitle}
                        onChange={(e) => setCampaignTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm bg-slate-50 focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-500">Date/Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm bg-slate-50 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsScheduling(false)}
                      className="px-3 py-1.5 border border-slate-200 rounded-sm text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-sm hover:bg-indigo-700 cursor-pointer shadow-xs"
                    >
                      Lock-in
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 my-auto">
            {isGenerating ? (
              <div className="space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-slate-500">Connecting to Gemini API, dreaming up copywriting copy...</p>
              </div>
            ) : (
              <div className="space-y-2 max-w-sm">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-slate-700 font-bold text-sm font-display">Waiting for Caption Prompt</h4>
                <p className="text-xs text-slate-400">Describe your product offer, promotion, or hotel discount. Gemini will write perfect tailored posts for you instantly.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
