import React from 'react';

interface VeloxMarkProps { size?: number; animate?: boolean; className?: string; }

export function VeloxMark({ size = 40, animate = true, className = '' }: VeloxMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animate ? 'velox-mark-animate' : ''} ${className}`}>
      <defs>
        <linearGradient id="velox-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <filter id="velox-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#velox-bg)"/>
      {/* V shape left */}
      <path d="M8 10 L14 28 L20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      {/* S shape right */}
      <path d="M24 12 C24 12 30 12 30 16 C30 20 24 20 24 24 C24 28 30 28 30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9"/>
      {/* Lightning bolt */}
      <path d="M20 13 L17 21 L20.5 21 L18 29" className={animate ? 'velox-bolt-animate' : ''}
        stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        filter="url(#velox-glow)"/>
    </svg>
  );
}

export function VeloxWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`} style={{ color: 'var(--text)' }}>
      <span style={{ color: 'var(--primary)' }}>V</span>elox
      <span style={{ color: 'var(--primary)' }}>S</span>pace
    </span>
  );
}
