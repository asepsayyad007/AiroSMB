import React from 'react';

export default function AiroShareIcon({ size = 32, className = '', style = {} }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1000 1000" 
      width={size} 
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '22%', ...style }}
    >
      <defs>
        <linearGradient id="airoBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF5D0B"/>
          <stop offset="30%" stopColor="#FF4C25"/>
          <stop offset="65%" stopColor="#E02A24"/>
          <stop offset="90%" stopColor="#9E121F"/>
          <stop offset="100%" stopColor="#7C0813"/>
        </linearGradient>

        <linearGradient id="airoMonitorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4B2B" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#3B050A" stopOpacity="0.75"/>
        </linearGradient>
      </defs>

      {/* Main Sunset Icon Background */}
      <rect x="50" y="50" width="900" height="900" rx="240" fill="url(#airoBgGrad)" />

      {/* PC Monitor Display & Integrated Share Nodes */}
      <g>
        {/* PC Stand Neck */}
        <path d="M 480,560 L 480,640 L 520,640 L 520,560 Z" fill="#FFFFFF"/>
        {/* PC Stand Base */}
        <path d="M 410,640 L 590,640" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round"/>
        {/* PC Monitor Bezel */}
        <rect x="250" y="270" width="500" height="290" rx="24" fill="url(#airoMonitorGrad)" stroke="#FFFFFF" strokeWidth="26" strokeLinejoin="round" />

        {/* Integrated Share Network Nodes */}
        <g stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1="440" y1="415" x2="550" y2="355" />
          <line x1="440" y1="415" x2="550" y2="475" />
          
          <circle cx="430" cy="415" r="20" fill="#FFFFFF" />
          <circle cx="560" cy="350" r="20" fill="#FFFFFF" />
          <circle cx="560" cy="480" r="20" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}
