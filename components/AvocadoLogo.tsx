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
            <stop offset="0%" stopColor="#7dd87d" />
            <stop offset="30%" stopColor="#5cb85c" />
            <stop offset="60%" stopColor="#4a9d4a" />
            <stop offset="100%" stopColor="#3d8b3d" />
          </linearGradient>
          <linearGradient id="avocadoInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8f5e8" />
            <stop offset="40%" stopColor="#c8e6c9" />
            <stop offset="100%" stopColor="#a5d6a7" />
          </linearGradient>
          <filter id="grayscale">
            <feColorMatrix type="matrix" values="0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0"/>
          </filter>
          <clipPath id="pitClip">
            <ellipse cx="100" cy="100" rx="32" ry="38" />
          </clipPath>
        </defs>

        {/* More realistic avocado outer shape - elongated */}
        <path
          d="M100 25 Q140 35 150 75 Q155 100 150 125 Q140 165 100 175 Q60 165 50 125 Q45 100 50 75 Q60 35 100 25 Z"
          fill="url(#avocadoGradient)"
          stroke="#2e7d32"
          strokeWidth="2"
        />

        {/* Avocado inner flesh - more realistic shape */}
        <path
          d="M100 35 Q130 42 138 75 Q142 100 138 125 Q130 158 100 165 Q70 158 62 125 Q58 100 62 75 Q70 42 100 35 Z"
          fill="url(#avocadoInnerGradient)"
        />

        {/* Face as the pit - elliptical and more prominent */}
        <g clipPath="url(#pitClip)">
          <image
            href="/dlyalogo.jpg"
            x="68"
            y="62"
            width="64"
            height="76"
            preserveAspectRatio="xMidYMid slice"
            filter="url(#grayscale)"
            className="object-cover"
          />
          {/* Enhanced pit overlay for realistic look */}
          <ellipse
            cx="100"
            cy="100"
            rx="32"
            ry="38"
            fill="rgba(101, 67, 33, 0.25)"
          />
          {/* Inner pit highlight */}
          <ellipse
            cx="95"
            cy="95"
            rx="20"
            ry="24"
            fill="rgba(139, 90, 43, 0.15)"
          />
        </g>

        {/* More realistic pit outline */}
        <ellipse
          cx="100"
          cy="100"
          rx="32"
          ry="38"
          fill="none"
          stroke="#654321"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Realistic avocado skin texture */}
        <path
          d="M70 60 Q75 55 80 58 M85 50 Q90 48 95 52 M120 55 Q125 52 130 56 M135 65 Q140 63 145 67"
          stroke="#2e7d32"
          strokeWidth="1"
          opacity="0.3"
          fill="none"
        />

        {/* Enhanced 3D highlight for avocado */}
        <ellipse
          cx="75"
          cy="65"
          rx="18"
          ry="25"
          fill="rgba(255, 255, 255, 0.25)"
          transform="rotate(-25 75 65)"
        />

        {/* Pit highlight for depth */}
        <ellipse
          cx="90"
          cy="85"
          rx="12"
          ry="15"
          fill="rgba(255, 255, 255, 0.15)"
          transform="rotate(-15 90 85)"
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
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
        `}</style>
      )}
    </div>
  );
}
