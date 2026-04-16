"use client";

import React from "react";

interface AvocadoLogoProps {
  size?: "small" | "large";
  className?: string;
  animated?: boolean;
}

export default function AvocadoLogo({ 
  size = "small", 
  className = "", 
  animated = false 
}: AvocadoLogoProps) {
  const sizeClasses = size === "large" ? "w-48 h-48" : "w-16 h-16";
  const animationClass = animated ? "animate-spin-slow" : "";

  return (
    <div className={`${sizeClasses} ${animationClass} ${className} relative`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-lg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Avocado outer shape */}
        <defs>
          <linearGradient id="avocadoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="50%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
          <linearGradient id="avocadoInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="50%" stopColor="#dcfce7" />
            <stop offset="100%" stopColor="#bbf7d0" />
          </linearGradient>
          <linearGradient id="bloomingSeedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7F50" />
            <stop offset="50%" stopColor="#FFF44F" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>
        </defs>

        {/* Mint green avocado outer shape */}
        <ellipse
          cx="100"
          cy="100"
          rx="85"
          ry="95"
          fill="url(#avocadoGradient)"
          stroke="#86efac"
          strokeWidth="2"
        />

        {/* Avocado inner flesh */}
        <ellipse
          cx="100"
          cy="100"
          rx="75"
          ry="85"
          fill="url(#avocadoInnerGradient)"
        />

        {/* Blooming seed heart - AI symbol */}
        <g className={animated ? "animate-pulse-slow" : ""}>
          {/* Main heart shape */}
          <path
            d="M100 85 C100 75, 85 65, 75 65 C65 65, 55 75, 55 85 C55 95, 100 135, 100 135 C100 135, 145 95, 145 85 C145 75, 135 65, 125 65 C115 65, 100 75, 100 85 Z"
            fill="url(#bloomingSeedGradient)"
            stroke="#FF7F50"
            strokeWidth="2"
            opacity="0.9"
          />
          
          {/* Inner petals - blooming effect */}
          <ellipse cx="85" cy="75" rx="8" ry="12" fill="#FFF44F" opacity="0.7" transform="rotate(-30 85 75)" />
          <ellipse cx="115" cy="75" rx="8" ry="12" fill="#FFF44F" opacity="0.7" transform="rotate(30 115 75)" />
          <ellipse cx="100" cy="90" rx="6" ry="10" fill="#FFB347" opacity="0.6" />
          
          {/* Center glow */}
          <circle cx="100" cy="85" r="8" fill="#FF7F50" opacity="0.8" />
          <circle cx="100" cy="85" r="4" fill="#FFF44F" />
          
          {/* Sparkles around the heart */}
          <circle cx="70" cy="70" r="2" fill="#FFF44F" opacity="0.8" />
          <circle cx="130" cy="70" r="2" fill="#FFF44F" opacity="0.8" />
          <circle cx="80" cy="110" r="1.5" fill="#FF7F50" opacity="0.7" />
          <circle cx="120" cy="110" r="1.5" fill="#FF7F50" opacity="0.7" />
        </g>

        {/* Highlight for 3D effect */}
        <ellipse
          cx="80"
          cy="70"
          rx="15"
          ry="20"
          fill="rgba(255, 255, 255, 0.3)"
          transform="rotate(-20 80 70)"
        />
      </svg>

      {animated && (
        <style jsx>{`
          @keyframes spin-slow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes pulse-slow {
            0%, 100% {
              transform: scale(1);
              opacity: 0.9;
            }
            50% {
              transform: scale(1.05);
              opacity: 1;
            }
          }
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
            transform-origin: center;
          }
        `}</style>
      )}
    </div>
  );
}
