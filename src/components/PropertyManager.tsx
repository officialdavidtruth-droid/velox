/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Building,
  Calendar,
  DollarSign,
  Plus,
  Sparkles,
  Users,
  Check,
  Send,
  Loader,
  AlertCircle,
  Home,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { Property, PMSBooking, PlatformType } from '../types';

interface PropertyManagerProps {
  workspaceId: string;
  onAddPostToCalendar: (post: { title: string; description: string; platforms: PlatformType[]; delayHours: number }) => void;
  isOffline?: boolean;
}

export default function PropertyManager({ workspaceId, onAddPostToCalendar, isOffline }: PropertyManagerProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<PMSBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for Add Property
  const [isAddPropOpen, setIsAddPropOpen] = useState(false);
  const [propName, setPropName] = useState('');
  const [propDesc, setPropDesc] = useState('');
  const [propRate, setPropRate] = useState(250);
  const [propStatus, setPropStatus] = useState<'Available' | 'Occupied' | 'Maintenance' | 'Reserved'>('Available');
  const [propImage, setPropImage] = useState('');

  // Form states for Booking
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // AI Promotional State
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [selectedPromoProp, setSelectedPromoProp] = useState<Property | null>(null);
  const [aiDraft, setAiDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [promoPlatforms, setPromoPlatforms] = useState<PlatformType[]>(['instagram', 'facebook']);
  const [scheduleDelay, setScheduleDelay] = useState(1); // 1 hour prompt

  useEffect(() => {
    fetchPMSData();
  }, [workspaceId]);

  const fetchPMSData = async () => {
    setLoading(true);
    try {
      const propRes = await fetch(`/api/pms/properties?workspaceId=${workspaceId}`);
      const bRes = await fetch(`/api/pms/bookings?workspaceId=${workspaceId}`);
      if (propRes.ok && bRes.ok) {
        setProperties(await propRes.json());
        setBookings(await bRes.json());
      }
    } catch (err) {
      console.error('Error fetching PMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName || !propRate) return;

    try {
      const res = await fetch('/api/pms/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: propName,
          description: propDesc,
          ratePerNight: propRate,
          status: propStatus,
          imageUrl: propImage
        })
      });
      if (res.ok) {
        setIsAddPropOpen(false);
        setPropName('');
        setPropDesc('');
        setPropRate(250);
        setPropStatus('Available');
        setPropImage('');
        fetchPMSData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropId || !guestName || !checkIn || !checkOut) return;

    try {
      const res = await fetch('/api/pms/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropId,
          guestName,
          checkIn,
          checkOut
        })
      });
      if (res.ok) {
        setIsBookOpen(false);
        setGuestName('');
        setCheckIn('');
        setCheckOut('');
        fetchPMSData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPromo = (prop: Property) => {
    setSelectedPromoProp(prop);
    setIsPromoOpen(true);
    setAiDraft('');
    generatePromoDraft(prop);
  };

  const generatePromoDraft = async (prop: Property) => {
    setIsDrafting(true);
    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a holiday rental promotion for our luxury accommodation property named "${prop.name}". Details: ${prop.description}. Rate: ${prop.ratePerNight} dollars per night. Highlight prime vacancies!`,
          platform: 'instagram',
          tone: 'Luxury, Exclusive & Inspiring',
          cta: 'Book Now'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiDraft(data.caption);
      } else {
        setAiDraft(`✨ Experience true comfort at ${prop.name}! ✨\n\nDaily Rate: $${prop.ratePerNight}/night\n\n${prop.description}\n\nStrict geometric luxury waitlists are now open. Secure your calendar spots today! 🏡 DM us to book.`);
      }
    } catch (e) {
      setAiDraft(`✨ Experience true comfort at ${prop.name}! ✨\n\nDaily Rate: $${prop.ratePerNight}/night\n\n${prop.description}\n\nStrict geometric luxury waitlists are now open. Secure your calendar spots today! 🏡 DM us to book.`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleLaunchPromotion = () => {
    if (!selectedPromoProp || !aiDraft) return;

    onAddPostToCalendar({
      title: `Promotion: ${selectedPromoProp.name}`,
      description: aiDraft,
      platforms: promoPlatforms,
      delayHours: scheduleDelay
    });

    setIsPromoOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 font-sans">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
        <span className="text-xs font-semibold text-slate-500">Syncing PMS ledger streams...</span>
      </div>
    );
  }

  return (
    <div id="pms-system" className="space-y-6 font-sans">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm transition">
        <div className="flex items-center gap-3">
          <Building className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider font-display">Property Management Ledger (PMS)</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Sync hospitality assets, plan active occupancy schedules, and launch automated campaigns.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsBookOpen(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-1.5 rounded-sm transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Calendar className="w-3.5 h-3.5" /> Book a Stay
          </button>
          <button
            onClick={() => setIsAddPropOpen(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-sm transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Property
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
              The system is currently running on the off-grid properties data engine. All active lodgings, available suites, rate models, and guest occupancy rosters are loaded with zero latency from your local Workbox database cache. Adding properties or logging guest check-ins will operate seamlessly offline and will update the central database once connection drops are resolved.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Properties vs Occupancy list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Properties Listing */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-indigo-500" /> Active Hospitality Real Estate ({properties.length})
            </h3>

            {properties.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">No properties found. Add your first suite above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map((prop) => (
                  <div
                    key={prop.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-40 relative overflow-hidden bg-slate-200">
                        <img
                          src={prop.imageUrl}
                          alt={prop.name}
                          className="w-full h-full object-cover grayscale-20 pointer-events-none hover:grayscale-0 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                            prop.status === 'Available' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            prop.status === 'Occupied' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            prop.status === 'Reserved' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}>
                            {prop.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-1">
                        <h4 className="font-extrabold text-[#0f172a] dark:text-white text-xs truncate">{prop.name}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal line-clamp-2">{prop.description}</p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center justify-between">
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        Daily: <strong className="text-indigo-600 dark:text-indigo-400">${prop.ratePerNight}</strong>
                      </div>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleOpenPromo(prop)}
                          className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] font-bold px-2.5 py-1 rounded-sm hover:bg-indigo-100 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" /> Promote with AI
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Occupancy Schedules list */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-500" /> Active Occupancy list ({bookings.length})
            </h3>

            {bookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs">No active occupancy schedules registered.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const propertyMatch = properties.find((p) => p.id === b.propertyId);
                  return (
                    <div
                      key={b.id}
                      className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-3 rounded-sm text-xs leading-normal"
                    >
                      <div className="flex justify-between items-center mb-1 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="font-bold text-slate-800 dark:text-white truncate max-w-[130px]">{b.guestName}</span>
                        <span className="text-[8px] uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-1.5 py-0.5 rounded-sm">
                          {b.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <div className="truncate">
                          Property: <strong className="text-slate-700 dark:text-slate-300">{propertyMatch ? propertyMatch.name : 'Unknown Property'}</strong>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 font-mono text-[9px] mt-1">
                          <span>{b.checkIn}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span>{b.checkOut}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ADD PROPERTY */}
      {isAddPropOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 text-xs text-slate-700 dark:text-slate-300">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider border-b border-slate-250 dark:border-slate-800 pb-3">
              Add PMS Asset Property
            </h3>

            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Property Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lusso Oceanfront Penthouse"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-400 transition"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Property Description</label>
                <textarea
                  rows={3}
                  placeholder="Elegant master suite, panoramic sunrise balcony slots..."
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-400 transition"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Daily Rate ($)</label>
                  <input
                    type="number"
                    required
                    value={propRate}
                    onChange={(e) => setPropRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-400 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Initial Occupancy Status</label>
                  <select
                    value={propStatus}
                    onChange={(e) => setPropStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-404 transition"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Reserved">Reserved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Asset Photo/Image Url (Optional)</label>
                <input
                  type="url"
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                  value={propImage}
                  onChange={(e) => setPropImage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-400 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPropOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm cursor-pointer shadow-xs"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOOK STAY */}
      {isBookOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-sm shadow-md border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 text-xs text-slate-700 dark:text-slate-300">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Book a Hospitality Stay (PMS)
            </h3>

            <form onSubmit={handleBookProperty} className="space-y-4">
              <div>
                <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Select property suite</label>
                <select
                  required
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-400"
                >
                  <option value="">-- Choose Accommodation --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.ratePerNight}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Guest Human Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Cooper"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Check-In Date</label>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600 dark:text-slate-450 font-bold">Check-Out Date</label>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm cursor-pointer"
                >
                  Finalize Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI PROMO CONTEXT GENERATOR */}
      {isPromoOpen && selectedPromoProp && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 text-xs text-slate-700 dark:text-slate-300">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider border-b border-slate-205 dark:border-slate-800 pb-3 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" /> Promote Suite: {selectedPromoProp.name}
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-sm border border-slate-100 dark:border-slate-850">
                <p className="text-[11px] text-slate-500 uppercase font-bold mb-1">Target Description Source:</p>
                <p className="font-mono text-[10px] text-slate-700 dark:text-slate-300">"{selectedPromoProp.description}"</p>
                <p className="text-[10px] text-indigo-600 font-bold mt-1">Daily Rate: ${selectedPromoProp.ratePerNight}/night</p>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-slate-600 dark:text-slate-400">Simultaneous Posting Channels</label>
                <div className="flex flex-wrap gap-2">
                  {(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'] as PlatformType[]).map((p) => {
                    const isSelected = promoPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setPromoPlatforms(promoPlatforms.filter(item => item !== p));
                          } else {
                            setPromoPlatforms([...promoPlatforms, p]);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-sm font-bold border capitalize transition ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-750 dark:text-slate-400">AI Generated Promo post</label>
                {isDrafting ? (
                  <div className="w-full h-32 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                    <Loader className="w-6 h-6 text-indigo-600 animate-spin mr-2" />
                    <span>Gemini is composing vacancy campaign...</span>
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white focus:bg-white outline-none"
                  ></textarea>
                )}
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-600 dark:text-slate-450">Scheduling Delay Offset</label>
                <select
                  value={scheduleDelay}
                  onChange={(e) => setScheduleDelay(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-sm cursor-pointer"
                >
                  <option value={0}>Publish Instantly (Simultaneous Live Broadcaster)</option>
                  <option value={1}>Schedule in 1 hour</option>
                  <option value={24}>Schedule in 24 hours (Tomorrow)</option>
                  <option value={48}>Schedule in 48 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPromoOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchPromotion}
                  disabled={isDrafting || !aiDraft}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-sm cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Broadcast campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
