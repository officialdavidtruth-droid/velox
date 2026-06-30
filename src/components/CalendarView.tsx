/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, Check, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { ScheduledPost, ContentCalendarEvent, PlatformType, CtaType } from '../types';

interface CalendarViewProps {
  workspaceId: string;
  posts: ScheduledPost[];
  onRefresh: () => void;
  isOffline?: boolean;
}

interface Holiday {
  name: string;
  date: string;
  type: 'national' | 'seasonal' | 'public';
}

export default function CalendarView({ workspaceId, posts, onRefresh, isOffline }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedCountry, setSelectedCountry] = useState<'Nigeria' | 'Ghana' | 'South Africa' | 'USA' | 'UK' | 'Canada' | 'Australia'>('USA');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Post Creator modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  
  // Form fields
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postPlatforms, setPostPlatforms] = useState<PlatformType[]>(['instagram']);
  const [postCta, setPostCta] = useState<CtaType>('None');
  const [postTime, setPostTime] = useState('');

  // Fetch country holidays
  useEffect(() => {
    fetch(`/api/holidays?country=${encodeURIComponent(selectedCountry)}&year=${currentDate.getFullYear()}`)
      .then(res => res.json())
      .then(data => setHolidays(data))
      .catch(err => console.error('Error fetching holidays:', err));
  }, [selectedCountry, currentDate]);

  // Handle post submit (create/edit)
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postDesc || !postTime) return;

    const payload = {
      workspace_id: workspaceId,
      title: postTitle,
      description: postDesc,
      platforms: postPlatforms,
      cta: postCta,
      publish_date: new Date(postTime).toISOString(),
    };

    if (editingPost) {
      await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    setIsModalOpen(false);
    resetForm();
    onRefresh();
  };

  const handleEditClick = (post: ScheduledPost) => {
    setEditingPost(post);
    setPostTitle(post.title);
    setPostDesc(post.description);
    setPostPlatforms(post.platforms);
    setPostCta(post.cta);
    
    // Format date for datetime-local input
    const d = new Date(post.publish_date);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    setPostTime(local);
    
    setIsModalOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm('Are you sure you want to cancel and delete this scheduled post?')) {
      await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      });
      onRefresh();
    }
  };

  const resetForm = () => {
    setEditingPost(null);
    setPostTitle('');
    setPostDesc('');
    setPostPlatforms(['instagram']);
    setPostCta('None');
    setPostTime('');
  };

  // Drag and drop date update simulation (moving inside list)
  const reschedulePost = async (postId: string, offsetDays: number) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const targetDate = new Date(post.publish_date);
    targetDate.setDate(targetDate.getDate() + offsetDays);
    
    await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish_date: targetDate.toISOString() })
    });
    onRefresh();
  };

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const publishNow = async (postId: string) => {
    setPublishingId(postId);
    setPublishMsg(null);
    try {
      const res = await fetch(`/api/posts/${postId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': localStorage.getItem('velox_token') || '' },
      });
      const d = await res.json();
      const failed = (d.results || []).filter((r: any) => !r.success);
      if (d.all_success) {
        setPublishMsg({ id: postId, text: 'Published to all platforms!', ok: true });
      } else if (d.success) {
        setPublishMsg({ id: postId, text: `Partial: ${failed.map((f: any) => `${f.platform} failed (${f.error})`).join(', ')}`, ok: false });
      } else {
        setPublishMsg({ id: postId, text: failed[0]?.error || d.error || 'Publish failed.', ok: false });
      }
      onRefresh();
    } catch {
      setPublishMsg({ id: postId, text: 'Network error publishing.', ok: false });
    }
    setPublishingId(null);
    setTimeout(() => setPublishMsg(null), 6000);
  };

  // Helper values for Month calendar render
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayIndex = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const m = new Date(currentDate);
    m.setMonth(m.getMonth() - 1);
    setCurrentDate(m);
  };

  const nextMonth = () => {
    const m = new Date(currentDate);
    m.setMonth(m.getMonth() + 1);
    setCurrentDate(m);
  };

  // Platforms helper colors
  const getPlatformColors = (platform: PlatformType) => {
    switch (platform) {
      case 'instagram': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'facebook': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'twitter': return 'bg-neutral-100 border-neutral-300 text-neutral-800';
      case 'linkedin': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'tiktok': return 'bg-rose-50 border-rose-200 text-rose-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div id="calendar-view" className="space-y-6 font-sans">
      {/* Calendar Top Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-sm border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800 font-display">Social Content Calendar</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Country Holiday Sync */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-sm text-xs border border-slate-200">
            <span className="text-slate-500 font-medium">Holidays:</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 cursor-pointer outline-none focus:ring-0"
            >
              <option value="USA">🇺🇸 United States</option>
              <option value="UK">🇬🇧 United Kingdom</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Nigeria">🇳🇬 Nigeria</option>
              <option value="Ghana">🇬🇭 Ghana</option>
              <option value="South Africa">🇿🇦 South Africa</option>
              <option value="Australia">🇦🇺 Australia</option>
            </select>
          </div>

          {/* View Modes */}
          <div className="flex bg-slate-100 p-1 rounded-sm text-xs font-medium text-slate-600 border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-sm transition-all ${viewMode === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-sm transition-all ${viewMode === 'week' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-sm transition-all ${viewMode === 'day' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Today
            </button>
          </div>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Post
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 p-4 rounded-sm flex items-start gap-3 text-xs leading-normal font-sans animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <div className="font-extrabold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400 mb-0.5 font-mono">
              ⚡ WORKBOX OFFLINE MODE: ACTIVE
            </div>
            <p>
              Your system has transitioned to active off-grid view mode. The social content calendar is fully readable, with cached scheduled posts retrieved instantly from the secure Service Worker storage. Any local content updates, drafts, and calendar changes will be cached and synchronized with the full-stack database server automatically when your active network path is restored.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Calendar Layout vs Active Scheduled Posts Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Calendar Grid Sheet */}
        <div className="lg:col-span-3 bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-1 px-3 bg-slate-50 rounded-sm hover:bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200 cursor-pointer font-sans"
            >
              Prev
            </button>
            <h3 className="text-md font-bold text-slate-800 font-display">{monthLabel}</h3>
            <button
              onClick={nextMonth}
              className="p-1 px-3 bg-slate-50 rounded-sm hover:bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200 cursor-pointer font-sans"
            >
              Next
            </button>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 text-center font-semibold text-slate-500 text-xs py-2 border-b border-slate-100">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Block Grid */}
          {setViewMode && viewMode === 'month' && (
            <div className="grid grid-cols-7 auto-rows-[120px] gap-1 mt-2 font-sans">
              {/* Empty slots for offset */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`offset-${idx}`} className="bg-slate-50 border border-slate-100 rounded-sm p-2 text-slate-300 text-xs"></div>
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const formattedDay = String(dayNum).padStart(2, '0');
                const formattedMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dateCompareStr = `-${formattedMonth}-${formattedDay}`;

                // Extract holiday today
                const holidayToday = holidays.find(h => h.date.endsWith(dateCompareStr));

                // Find posts scheduled for this day
                const postsToday = posts.filter(p => {
                  const pDate = new Date(p.publish_date);
                  return pDate.getFullYear() === currentDate.getFullYear() &&
                         pDate.getMonth() === currentDate.getMonth() &&
                         pDate.getDate() === dayNum;
                });

                const isToday = new Date().getDate() === dayNum &&
                                new Date().getMonth() === currentDate.getMonth() &&
                                new Date().getFullYear() === currentDate.getFullYear();

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`relative border border-slate-200 rounded-sm p-2 flex flex-col gap-1 overflow-hidden group transition ${
                      isToday ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-300' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>
                      {dayNum}
                    </span>

                    {/* Holiday badge */}
                    {holidayToday && (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm px-1 py-[1px] text-[8px] font-bold line-clamp-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        {holidayToday.name}
                      </div>
                    )}

                    {/* Posts inside day cell */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {postsToday.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleEditClick(p)}
                          className={`text-[9px] p-1 rounded-sm border cursor-pointer font-semibold line-clamp-1 flex items-center justify-between ${getPlatformColors(p.platforms[0])} shadow-2xs hover:scale-102 transition`}
                          title={`${p.title} (${p.platforms.join(', ')})`}
                        >
                          <span>{p.title}</span>
                          <span className="text-[7px] text-slate-400 font-mono">
                            {new Date(p.publish_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple Fallback notification for quick daily views */}
          {viewMode !== 'month' && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 font-sans">
              <Clock className="w-10 h-10 text-slate-300 mb-3 animate-pulse" />
              <p className="text-sm font-semibold">Active Day Scheduler Loaded</p>
              <p className="text-xs max-w-sm mt-1">
                Displaying detailed workflow for {monthLabel}. Click any day block or click <strong>Add Post</strong> to schedule new automated campaigns.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Panel for Content Queue & Drag operations representation */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex flex-col gap-4 font-sans">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-indigo-900 font-bold text-sm tracking-tight font-display">Workflow Queue</h4>
            <span className="bg-slate-200 text-slate-700 px-2 py-[2px] rounded-sm text-[10px] font-bold">{posts.length} Active</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {posts.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No campaigns queued. Create your premium captions using the AI Assistant!</p>
              </div>
            ) : (
              posts.map(p => (
                <div key={p.id} className="bg-white border border-slate-200 p-3 rounded-sm shadow-sm group relative hover:border-indigo-400 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-[2px] font-bold rounded-sm uppercase tracking-wide">
                      {p.platforms.join(' | ')}
                    </span>
                    <span className={`text-[9px] px-1.5 py-[2px] rounded-sm font-semibold ${
                      p.status === 'published' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-slate-800 truncate mb-1">{p.title}</h5>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">{p.description}</p>

                  <div className="flex items-center gap-2 text-[9px] text-slate-500 border-t border-slate-200 pt-2 selection:bg-indigo-100 font-sans">
                    <Clock className="w-3" />
                    <span>{new Date(p.publish_date).toLocaleDateString()} {new Date(p.publish_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {p.status !== 'published' && (
                    <button
                      onClick={() => publishNow(p.id)}
                      disabled={publishingId === p.id}
                      className="mt-2 w-full text-[10px] font-bold py-1.5 rounded-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {publishingId === p.id ? 'Publishing…' : `Publish Now to ${p.platforms.length} platform${p.platforms.length > 1 ? 's' : ''}`}
                    </button>
                  )}
                  {publishMsg && publishMsg.id === p.id && (
                    <p className={`mt-1.5 text-[9px] leading-relaxed ${publishMsg.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {publishMsg.text}
                    </p>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 bg-white/95 absolute inset-x-0 bottom-0 p-2 flex items-center justify-around border-t border-slate-200 transition-opacity rounded-b-sm">
                    <button
                      onClick={() => handleEditClick(p)}
                      className="text-xs text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3" /> Edit
                    </button>
                    <button
                      onClick={() => reschedulePost(p.id, 1)}
                      className="text-xs text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer"
                      title="Postpone by 1 day"
                    >
                      +1d
                    </button>
                    <button
                      onClick={() => handleDeletePost(p.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3" /> Drop
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT SCHEDULED CAMPAIGN DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-sm shadow-sm border border-slate-200 max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-sm font-bold text-slate-900 mb-4 font-display uppercase tracking-wider border-b border-slate-200 pb-3">
              {editingPost ? 'Update Scheduled Campaign' : 'Schedule Social Post Campaign'}
            </h3>

            <form onSubmit={handleSavePost} className="space-y-4 text-xs font-semibold text-slate-700">
              
              {/* Title Field */}
              <div>
                <label className="block mb-1 text-slate-600">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Deluxe Spa Day Launch"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition"
                />
              </div>

              {/* Description Body */}
              <div>
                <label className="block mb-1 text-slate-600">Post Description Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Include captions, tags and hooks..."
                  value={postDesc}
                  onChange={(e) => setPostDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition"
                ></textarea>
              </div>

              {/* Platform Selector checkboxes */}
              <div>
                <label className="block mb-1.5 text-slate-600">Target Social Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'] as PlatformType[]).map((p) => {
                    const isSelected = postPlatforms.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          if (isSelected) {
                            if (postPlatforms.length > 1) {
                              setPostPlatforms(postPlatforms.filter(plat => plat !== p));
                            }
                          } else {
                            setPostPlatforms([...postPlatforms, p]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-sm font-bold border capitalize transition ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CTA Selection */}
              <div>
                <label className="block mb-1 text-slate-600 font-sans">Call-To-Action Button</label>
                <select
                  value={postCta}
                  onChange={(e) => setPostCta(e.target.value as CtaType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition capitalize cursor-pointer"
                >
                  <option value="None">None (Pure Informational)</option>
                  <option value="Book Now">Book Now</option>
                  <option value="Learn More">Learn More</option>
                  <option value="Contact Us">Contact Us</option>
                  <option value="Reserve Now">Reserve Now</option>
                </select>
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="block mb-1 text-slate-600">Schedule Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm outline-none bg-slate-50 focus:bg-white focus:border-slate-404 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-sm text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm cursor-pointer shadow-xs"
                >
                  {editingPost ? 'Update Post' : 'Schedule Campaign'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
