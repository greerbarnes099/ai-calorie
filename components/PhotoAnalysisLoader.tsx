"use client";

import React from "react";

interface PhotoAnalysisLoaderProps {
  className?: string;
}

export default function PhotoAnalysisLoader({ className = "" }: PhotoAnalysisLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-4 ${className}`}>
      {/* Animated avocado logo */}
      <div className="relative">
        <div className="w-16 h-16 animate-spin-slow">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-lg"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF7F50" />
                <stop offset="50%" stopColor="#FFF44F" />
                <stop offset="100%" stopColor="#A7F3D0" />
              </linearGradient>
            </defs>
            
            {/* Avocado shape */}
            <ellipse
              cx="100"
              cy="100"
              rx="85"
              ry="95"
              fill="url(#loaderGradient)"
              stroke="#FF7F50"
              strokeWidth="2"
            />
            
            {/* Blooming seed heart */}
            <path
              d="M100 85 C100 75, 85 65, 75 65 C65 65, 55 75, 55 85 C55 95, 100 135, 100 135 C100 135, 145 95, 145 85 C145 75, 135 65, 125 65 C115 65, 100 75, 100 85 Z"
              fill="#FF7F50"
              stroke="#FFF44F"
              strokeWidth="2"
              opacity="0.9"
            />
          </svg>
        </div>
        
        {/* Pulsating ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 border-2 border-[#FF7F50] rounded-full animate-ping" />
        </div>
      </div>

      {/* Loading text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-slate-800 font-['Geist,sans-serif']">
          Analyzing your food...
        </p>
        <p className="text-sm text-slate-600 font-['Inter,sans-serif']">
          AI is identifying ingredients and calculating nutrition
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-[#FF7F50] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-3 h-3 bg-[#FFF44F] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-3 h-3 bg-[#A7F3D0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#FF7F50] via-[#FFF44F] to-[#A7F3D0] animate-pulse" style={{ 
          animation: 'progress 2s ease-in-out infinite' 
        }} />
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
