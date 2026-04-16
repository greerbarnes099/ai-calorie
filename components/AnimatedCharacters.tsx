"use client";

import { useState, useEffect, useRef } from "react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    // If forced look direction is provided, use that instead of mouse tracking
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ 
  size = 48, 
  pupilSize = 16, 
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    // If forced look direction is provided, use that instead of mouse tracking
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};

interface AnimatedCharactersProps {
  isCreatingProfile?: boolean;
  profilesCount?: number;
}

export default function AnimatedCharacters({ 
  isCreatingProfile = false,
  profilesCount = 0
}: AnimatedCharactersProps) {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isCoralBlinking, setIsCoralBlinking] = useState(false);
  const [isMintBlinking, setIsMintBlinking] = useState(false);
  const [isLemonBlinking, setIsLemonBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isCoralPeeking, setIsCoralPeeking] = useState(false);
  const coralRef = useRef<HTMLDivElement>(null);
  const mintRef = useRef<HTMLDivElement>(null);
  const lemonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking effects
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = (setBlinking: (blink: boolean) => void) => {
      const blinkTimeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          scheduleBlink(setBlinking);
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const coralTimeout = scheduleBlink(setIsCoralBlinking);
    const mintTimeout = scheduleBlink(setIsMintBlinking);
    const lemonTimeout = scheduleBlink(setIsLemonBlinking);

    return () => {
      clearTimeout(coralTimeout);
      clearTimeout(mintTimeout);
      clearTimeout(lemonTimeout);
    };
  }, []);

  // Looking at each other animation when creating profile
  useEffect(() => {
    if (isCreatingProfile) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isCreatingProfile]);

  // Coral peeking animation when creating profile
  useEffect(() => {
    if (isCreatingProfile && profilesCount > 0) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsCoralPeeking(true);
          setTimeout(() => {
            setIsCoralPeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsCoralPeeking(false);
    }
  }, [isCreatingProfile, profilesCount]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const coralPos = calculatePosition(coralRef);
  const mintPos = calculatePosition(mintRef);
  const lemonPos = calculatePosition(lemonRef);

  return (
    <div className="relative" style={{ width: '550px', height: '400px' }}>
      {/* Coral tall rectangle character - Back layer */}
      <div 
        ref={coralRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '70px',
          width: '180px',
          height: isCreatingProfile ? '440px' : '400px',
          backgroundColor: '#FFB6C1',
          borderRadius: '10px 10px 0 0',
          zIndex: 1,
          transform: isCreatingProfile
            ? `skewX(0deg) translateX(40px)` 
            : isLookingAtEachOther
              ? `skewX(${(coralPos.bodySkew || 0) - 12}deg) translateX(40px)` 
              : `skewX(${coralPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes */}
        <div 
          className="absolute flex gap-8 transition-all duration-700 ease-in-out"
          style={{
            left: isCreatingProfile ? `${20}px` : isLookingAtEachOther ? `${55}px` : `${45 + coralPos.faceX}px`,
            top: isCreatingProfile ? `${35}px` : isLookingAtEachOther ? `${65}px` : `${40 + coralPos.faceY}px`,
          }}
        >
          <EyeBall 
            size={18} 
            pupilSize={7} 
            maxDistance={5} 
            eyeColor="white" 
            pupilColor="#2D2D2D" 
            isBlinking={isCoralBlinking}
            forceLookX={isCreatingProfile ? (isCoralPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={isCreatingProfile ? (isCoralPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
          />
          <EyeBall 
            size={18} 
            pupilSize={7} 
            maxDistance={5} 
            eyeColor="white" 
            pupilColor="#2D2D2D" 
            isBlinking={isCoralBlinking}
            forceLookX={isCreatingProfile ? (isCoralPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={isCreatingProfile ? (isCoralPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
          />
        </div>
      </div>

      {/* Mint tall rectangle character - Middle layer */}
      <div 
        ref={mintRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '240px',
          width: '120px',
          height: '310px',
          backgroundColor: '#A7F3D0',
          borderRadius: '8px 8px 0 0',
          zIndex: 2,
          transform: isCreatingProfile
            ? `skewX(0deg)` 
            : isLookingAtEachOther
              ? `skewX(${(mintPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)` 
              : `skewX(${mintPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes */}
        <div 
          className="absolute flex gap-6 transition-all duration-700 ease-in-out"
          style={{
            left: isCreatingProfile ? `${10}px` : isLookingAtEachOther ? `${32}px` : `${26 + mintPos.faceX}px`,
            top: isCreatingProfile ? `${28}px` : isLookingAtEachOther ? `${12}px` : `${32 + mintPos.faceY}px`,
          }}
        >
          <EyeBall 
            size={16} 
            pupilSize={6} 
            maxDistance={4} 
            eyeColor="white" 
            pupilColor="#2D2D2D" 
            isBlinking={isMintBlinking}
            forceLookX={isCreatingProfile ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={isCreatingProfile ? -4 : isLookingAtEachOther ? -4 : undefined}
          />
          <EyeBall 
            size={16} 
            pupilSize={6} 
            maxDistance={4} 
            eyeColor="white" 
            pupilColor="#2D2D2D" 
            isBlinking={isMintBlinking}
            forceLookX={isCreatingProfile ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={isCreatingProfile ? -4 : isLookingAtEachOther ? -4 : undefined}
          />
        </div>
      </div>

      {/* Lemon semi-circle character - Front left */}
      <div 
        ref={lemonRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '0px',
          width: '240px',
          height: '200px',
          zIndex: 3,
          backgroundColor: '#FFF44F',
          borderRadius: '120px 120px 0 0',
          transform: isCreatingProfile ? `skewX(0deg)` : `skewX(${lemonPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes - just pupils, no white */}
        <div 
          className="absolute flex gap-8 transition-all duration-200 ease-out"
          style={{
            left: isCreatingProfile ? `${50}px` : `${82 + (lemonPos.faceX || 0)}px`,
            top: isCreatingProfile ? `${85}px` : `${90 + (lemonPos.faceY || 0)}px`,
          }}
        >
          <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={isCreatingProfile ? -5 : undefined} forceLookY={isCreatingProfile ? -4 : undefined} />
          <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={isCreatingProfile ? -5 : undefined} forceLookY={isCreatingProfile ? -4 : undefined} />
        </div>
      </div>
    </div>
  );
}
