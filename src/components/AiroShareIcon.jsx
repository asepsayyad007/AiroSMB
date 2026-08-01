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

        {/* Deepened drop shadow to support the new heavier visual elements */}
        <filter id="elementShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000000" floodOpacity="0.5"/>
        </filter>
      </defs>

      {/* 1. Main Icon Base (Premium Squircle Frame) */}
      <rect x="50" y="50" width="900" height="900" rx="240" fill="url(#bgGrad)" />

      {/* 2. Main White Iconography Group (All elements thickened for maximum visibility) */}
      <g filter="url(#elementShadow)">
        
        {/* CENTRAL PC MONITOR DISPLAY (Thickened Borders and Base) */}
        {/* Thickened PC Stand Neck */}
        <path d="M 470,540 L 470,610 L 530,610 L 530,540 Z" fill="#FFFFFF"/>
        {/* Thickened PC Stand Base */}
        <path d="M 390,610 L 610,610" stroke="#FFFFFF" strokeWidth="32" strokeLinecap="round"/>
        {/* Thickened PC Monitor Bezel Shell */}
        <rect x="250" y="270" width="500" height="280" rx="24" fill="url(#monitorScreenGrad)" stroke="#FFFFFF" strokeWidth="40" strokeLinejoin="round" />

        {/* INTEGRATED SHARE ARROW NETWORK (Thickened Nodes and Tracks) */}
        <g stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Connecting Track Lines */}
          <line x1="440" y1="410" x2="550" y2="350" strokeWidth="26" />
          <line x1="440" y1="410" x2="550" y2="470" strokeWidth="26" />
          
          {/* Source Origin Node */}
          <circle cx="430" cy="410" r="26" fill="#FFFFFF" strokeWidth="0" />
          
          {/* Top Target Receiving Node */}
          <circle cx="560" cy="345" r="26" fill="#FFFFFF" strokeWidth="0" />
          
          {/* Bottom Target Receiving Node */}
          <circle cx="560" cy="475" r="26" fill="#FFFFFF" strokeWidth="0" />
        </g>

      </g>

      {/* 3. Typography Block: "AiroShare" */}
      <text x="500" y="745" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="900" fontSize="86" textAnchor="middle" letterSpacing="1">
        <tspan fill="#FFFFFF">Airo</tspan><tspan fill="url(#textGrad)">Share</tspan>
      </text>
    </svg>
  );
}
