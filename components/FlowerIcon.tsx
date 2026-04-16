import React from "react";

interface FlowerIconProps {
  className?: string;
  color?: "coral" | "lemon" | "blue";
  size?: "small" | "medium" | "large";
}

export default function FlowerIcon({ 
  className = "", 
  color = "coral", 
  size = "small" 
}: FlowerIconProps) {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-8 h-8", 
    large: "w-12 h-12"
  };

  const colors = {
    coral: "#FF7F50",
    lemon: "#FFF44F", 
    blue: "#A7F3D0"
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClasses[size]} ${className} float-flower`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`flowerGradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors[color]} />
          <stop offset="100%" stopColor={color === "coral" ? "#FFB347" : color === "lemon" ? "#FFD700" : "#6EE7B7"} />
        </linearGradient>
      </defs>
      
      {/* Flower petals */}
      <circle cx="50" cy="30" r="12" fill={`url(#flowerGradient-${color})`} opacity="0.8" />
      <circle cx="30" cy="50" r="12" fill={`url(#flowerGradient-${color})`} opacity="0.8" />
      <circle cx="70" cy="50" r="12" fill={`url(#flowerGradient-${color})`} opacity="0.8" />
      <circle cx="50" cy="70" r="12" fill={`url(#flowerGradient-${color})`} opacity="0.8" />
      <circle cx="35" cy="35" r="10" fill={`url(#flowerGradient-${color})`} opacity="0.7" />
      <circle cx="65" cy="35" r="10" fill={`url(#flowerGradient-${color})`} opacity="0.7" />
      <circle cx="35" cy="65" r="10" fill={`url(#flowerGradient-${color})`} opacity="0.7" />
      <circle cx="65" cy="65" r="10" fill={`url(#flowerGradient-${color})`} opacity="0.7" />
      
      {/* Center */}
      <circle cx="50" cy="50" r="8" fill={colors[color]} />
      <circle cx="50" cy="50" r="4" fill="#FFF5F5" opacity="0.8" />
    </svg>
  );
}
