import React, { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const LOCATIONS = [
  // African Countries
  'Nigeria','Ghana','Kenya','South Africa','Ethiopia','Egypt','Tanzania','Uganda','Rwanda','Senegal',
  'Côte d\'Ivoire','Cameroon','Zambia','Zimbabwe','Botswana','Mozambique','Angola','Namibia','Mali',
  'Morocco','Tunisia','Algeria','Libya','Sudan','Somalia','Malawi','Lesotho','Eswatini','Benin',
  // Nigerian States & Major Cities
  'Lagos, Nigeria','Abuja, Nigeria','Kano, Nigeria','Ibadan, Nigeria','Port Harcourt, Nigeria',
  'Benin City, Nigeria','Kaduna, Nigeria','Enugu, Nigeria','Aba, Nigeria','Onitsha, Nigeria',
  'Warri, Nigeria','Maiduguri, Nigeria','Zaria, Nigeria','Ilorin, Nigeria','Jos, Nigeria',
  'Abeokuta, Nigeria','Asaba, Nigeria','Owerri, Nigeria','Calabar, Nigeria','Uyo, Nigeria',
  'Akure, Nigeria','Ado-Ekiti, Nigeria','Osogbo, Nigeria','Lekki, Nigeria','Victoria Island, Nigeria',
  'Ikeja, Nigeria','Surulere, Nigeria','Yaba, Nigeria','Ajah, Nigeria','Badagry, Nigeria',
  'Rivers State, Nigeria','Lagos State, Nigeria','Abuja FCT, Nigeria','Ogun State, Nigeria',
  'Oyo State, Nigeria','Anambra State, Nigeria','Imo State, Nigeria','Delta State, Nigeria',
  'Cross River State, Nigeria','Akwa Ibom State, Nigeria',
  // Ghanaian Cities
  'Accra, Ghana','Kumasi, Ghana','Tamale, Ghana','Takoradi, Ghana','Cape Coast, Ghana',
  // Kenyan Cities
  'Nairobi, Kenya','Mombasa, Kenya','Kisumu, Kenya','Nakuru, Kenya','Eldoret, Kenya',
  // South African Cities
  'Johannesburg, South Africa','Cape Town, South Africa','Durban, South Africa',
  'Pretoria, South Africa','Port Elizabeth, South Africa','Bloemfontein, South Africa',
  // Other African Cities
  'Addis Ababa, Ethiopia','Cairo, Egypt','Dar es Salaam, Tanzania','Kampala, Uganda',
  'Kigali, Rwanda','Dakar, Senegal','Abidjan, Côte d\'Ivoire','Douala, Cameroon',
  'Lusaka, Zambia','Harare, Zimbabwe','Gaborone, Botswana','Maputo, Mozambique',
  'Casablanca, Morocco','Tunis, Tunisia','Algiers, Algeria','Khartoum, Sudan',
  // United States
  'USA','New York, USA','Los Angeles, USA','Chicago, USA','Houston, USA','Phoenix, USA',
  'Philadelphia, USA','San Antonio, USA','San Diego, USA','Dallas, USA','San Jose, USA',
  'Austin, USA','Jacksonville, USA','Fort Worth, USA','Columbus, USA','Charlotte, USA',
  'Indianapolis, USA','San Francisco, USA','Seattle, USA','Denver, USA','Washington DC, USA',
  'Nashville, USA','Oklahoma City, USA','El Paso, USA','Boston, USA','Atlanta, USA',
  'Miami, USA','Las Vegas, USA','Portland, USA','Memphis, USA','Minneapolis, USA',
  'California, USA','Texas, USA','Florida, USA','New York State, USA','Pennsylvania, USA',
  // United Kingdom
  'UK','London, UK','Manchester, UK','Birmingham, UK','Leeds, UK','Glasgow, UK',
  'Sheffield, UK','Bradford, UK','Edinburgh, UK','Liverpool, UK','Bristol, UK',
  'Wakefield, UK','Cardiff, UK','Coventry, UK','Nottingham, UK','Leicester, UK',
  'Sunderland, UK','Belfast, UK','Newcastle, UK','Brighton, UK','Plymouth, UK',
  // Europe
  'Germany','France','Netherlands','Spain','Italy','Portugal','Sweden','Norway',
  'Berlin, Germany','Paris, France','Amsterdam, Netherlands','Madrid, Spain',
  'Rome, Italy','Lisbon, Portugal','Stockholm, Sweden','Oslo, Norway',
  'Vienna, Austria','Brussels, Belgium','Zurich, Switzerland','Dublin, Ireland',
  // Middle East
  'UAE','Dubai, UAE','Abu Dhabi, UAE','Sharjah, UAE',
  'Saudi Arabia','Riyadh, Saudi Arabia','Jeddah, Saudi Arabia',
  'Qatar','Doha, Qatar','Kuwait','Kuwait City, Kuwait',
  // Asia
  'India','Mumbai, India','Delhi, India','Bangalore, India','Chennai, India','Hyderabad, India',
  'China','Beijing, China','Shanghai, China','Shenzhen, China',
  'Singapore','Malaysia','Kuala Lumpur, Malaysia',
  'Indonesia','Jakarta, Indonesia',
  'Philippines','Manila, Philippines',
  // Canada & Australia
  'Canada','Toronto, Canada','Vancouver, Canada','Montreal, Canada','Calgary, Canada',
  'Australia','Sydney, Australia','Melbourne, Australia','Brisbane, Australia','Perth, Australia',
].sort();

interface LocationInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function LocationInput({ value, onChange, placeholder = 'City, State or Country', className = '', style }: LocationInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = query.length === 0 ? [] : LOCATIONS.filter(l =>
    l.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50); // max 50, but show 7 in visible area via CSS

  const handleSelect = (loc: string) => {
    setQuery(loc);
    onChange(loc);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ color: 'var(--muted)' }}/>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        className={className}
        style={{ ...style, paddingLeft: '2rem' }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (query) setOpen(true); }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 rounded-xl shadow-xl overflow-hidden"
          style={{
            top: 'calc(100% + 4px)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            maxHeight: '252px', /* shows ~7 items at 36px each */
            overflowY: 'auto',
          }}>
          {suggestions.map(loc => (
            <button key={loc} type="button"
              onClick={() => handleSelect(loc)}
              className="w-full text-left px-4 py-2.5 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <MapPin size={10} style={{ color: 'var(--muted)', flexShrink: 0 }}/>
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
