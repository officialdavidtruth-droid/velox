import React from 'react';

interface VeloxLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function VeloxLogo({ size = 32, showText = true, className = '' }: VeloxLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ userSelect: 'none' }}>
      {/* Hexagon logo — matches uploaded brand image */}
      <img
        src="/logo.png"
        alt="Velox Space"
        width={size}
        height={size}
        style={{ borderRadius: size * 0.18, objectFit: 'contain' }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }}
      />
      {/* SVG fallback rendered but hidden until img fails */}
      <svg style={{ display: 'none' }} width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="100" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00C2D4"/>
            <stop offset="100%" stopColor="#8B5CF6"/>
          </linearGradient>
        </defs>
        <path d="M50 4 L94 27 L94 73 L50 96 L6 73 L6 27 Z" fill="url(#vg)" rx="8"/>
        <text x="50" y="76" textAnchor="middle" fill="white" fontSize="58" fontWeight="900" fontFamily="Inter,sans-serif">V</text>
      </svg>
      {showText && (
        <span style={{
          fontWeight: 800, fontSize: size * 0.46, letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #00C2D4 0%, #8B5CF6 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Velox Space
        </span>
      )}
    </div>
  );
}
