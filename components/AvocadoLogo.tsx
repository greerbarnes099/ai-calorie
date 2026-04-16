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
          <clipPath id="circleClip">
            <circle cx="100" cy="100" r="35" />
          </clipPath>
        </defs>

        {/* Avocado outer shape */}
        <ellipse
          cx="100"
          cy="100"
          rx="85"
          ry="95"
          fill="url(#avocadoGradient)"
          stroke="#4ade80"
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

        {/* Face as the pit - using your photo */}
        <g clipPath="url(#circleClip)">
          <image
            href="/dlyalogo.jpg"
            x="65"
            y="65"
            width="70"
            height="70"
            preserveAspectRatio="xMidYMid slice"
            className="object-cover"
          />
          {/* Add subtle overlay to make it look more like a pit */}
          <circle
            cx="100"
            cy="100"
            r="35"
            fill="rgba(139, 69, 19, 0.15)"
          />
        </g>

        {/* Pit outline */}
        <circle
          cx="100"
          cy="100"
          r="35"
          fill="none"
          stroke="#8b4513"
          strokeWidth="1.5"
          opacity="0.3"
        />

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
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
        `}</style>
      )}
    </div>
  );
}
