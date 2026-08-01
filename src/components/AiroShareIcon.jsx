import React from 'react';

export default function AiroShareIcon({ size = 32, className = '', style = {} }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1000 1000" 
      width={size} 
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <defs>
        {/* Pure Sunset Gradient (Warm Oranges & Deep Reds Only) */}
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF5D0B"/>
          <stop offset="30%" stopColor="#FF4C25"/>
          <stop offset="65%" stopColor="#E02A24"/>
          <stop offset="90%" stopColor="#9E121F"/>
          <stop offset="100%" stopColor="#7C0813"/>
        </linearGradient>

        {/* PC Monitor Screen Interior Fill Gradient */}
        <linearGradient id="monitorScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4B2B" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#3B050A" stopOpacity="0.65"/>
        </linearGradient>

        {/* App Branding Text Gradient */}
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#FFB38A"/>
        </linearGradient>

        {/* Deepened heavy drop shadow to match the maximum thick elements */}
        <filter id="elementShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="18" floodColor="#000000" floodOpacity="0.55"/>
        </filter>
      </defs>

      {/* 1. Main Icon Base (Premium Squircle Frame) */}
      <rect x="50" y="50" width="900" height="900" rx="240" fill="url(#bgGrad)" />

      {/* 2. Main White Iconography Group */}
      <g filter="url(#elementShadow)">
        
        {/* CENTRAL PC MONITOR DISPLAY (Large Scale Preserved) */}
        {/* Ultra-Thickened PC Stand Neck */}
        <path d="M 450,575 L 450,655 L 550,655 L 550,575 Z" fill="#FFFFFF"/>
        {/* Ultra-Thickened PC Stand Base */}
        <path d="M 340,655 L 660,655" stroke="#FFFFFF" strokeWidth="50" strokeLinecap="round"/>
        {/* Ultra-Thickened PC Monitor Bezel Shell */}
        <rect x="170" y="200" width="660" height="370" rx="36" fill="url(#monitorScreenGrad)" stroke="#FFFFFF" strokeWidth="60" strokeLinejoin="round" />

        {/* INTEGRATED SHARE ARROW NETWORK */}
        <g stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Connecting Track Lines */}
          <line x1="420" y1="385" x2="570" y2="305" strokeWidth="40" />
          <line x1="420" y1="385" x2="570" y2="465" strokeWidth="40" />
          
          {/* Source Origin Node */}
          <circle cx="410" cy="385" r="38" fill="#FFFFFF" strokeWidth="0" />
          
          {/* Top Target Receiving Node */}
          <circle cx="585" cy="300" r="38" fill="#FFFFFF" strokeWidth="0" />
          
          {/* Bottom Target Receiving Node */}
          <circle cx="585" cy="470" r="38" fill="#FFFFFF" stroke-width="0" />
        </g>

      </g>

      {/* 3. UPDATED TYPOGRAPHY BLOCK: "AiroShare" pushed further down near the bottom edge */}
      <text x="500" y="835" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="900" fontSize="86" textAnchor="middle" letterSpacing="1">
        <tspan fill="#FFFFFF">Airo</tspan><tspan fill="url(#textGrad)">Share</tspan>
      </text>
    </svg>
  );
}
