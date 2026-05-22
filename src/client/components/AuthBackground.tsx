import React, { useRef, useState, useCallback } from 'react';
import { useTheme } from './ThemeProvider';

interface ParallaxLayer {
  speed: number;
  icons: Array<{
    id: string;
    x: number;
    y: number;
    size: number;
    rotation: number;
    animDelay: string;
    component: React.ReactNode;
  }>;
}

const DormitoryIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="20" width="60" height="50" rx="4" stroke={color} strokeWidth="1.5" opacity="0.7" />
    <rect x="10" y="20" width="60" height="10" rx="4" stroke={color} strokeWidth="1.5" opacity="0.5" fill={color} fillOpacity="0.05" />
    <rect x="20" y="38" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <rect x="35" y="38" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <rect x="50" y="38" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <rect x="20" y="54" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.4" />
    <rect x="35" y="54" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.4" />
    <rect x="50" y="54" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.4" />
    <line x1="40" y1="14" x2="40" y2="20" stroke={color} strokeWidth="1.5" opacity="0.4" />
    <circle cx="40" cy="12" r="2" stroke={color} strokeWidth="1" opacity="0.4" />
  </svg>
);

const WindowIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="40" height="40" rx="6" stroke={color} strokeWidth="1.5" opacity="0.5" />
    <line x1="25" y1="5" x2="25" y2="45" stroke={color} strokeWidth="1" opacity="0.35" />
    <line x1="5" y1="25" x2="45" y2="25" stroke={color} strokeWidth="1" opacity="0.35" />
    <rect x="8" y="8" width="14" height="14" rx="2" fill={color} fillOpacity="0.06" />
    <rect x="28" y="28" width="14" height="14" rx="2" fill={color} fillOpacity="0.06" />
  </svg>
);

const KeyIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="20" r="10" stroke={color} strokeWidth="1.5" opacity="0.5" />
    <circle cx="18" cy="20" r="4" stroke={color} strokeWidth="1" opacity="0.3" />
    <line x1="28" y1="20" x2="45" y2="20" stroke={color} strokeWidth="1.5" opacity="0.5" />
    <line x1="38" y1="20" x2="38" y2="28" stroke={color} strokeWidth="1.5" opacity="0.4" />
    <line x1="43" y1="20" x2="43" y2="26" stroke={color} strokeWidth="1.5" opacity="0.4" />
  </svg>
);

const BedIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="15" width="50" height="18" rx="4" stroke={color} strokeWidth="1.5" opacity="0.5" />
    <rect x="8" y="10" width="14" height="10" rx="6" stroke={color} strokeWidth="1.2" opacity="0.4" fill={color} fillOpacity="0.04" />
    <line x1="5" y1="33" x2="5" y2="38" stroke={color} strokeWidth="1.5" opacity="0.4" />
    <line x1="55" y1="33" x2="55" y2="38" stroke={color} strokeWidth="1.5" opacity="0.4" />
    <line x1="25" y1="18" x2="52" y2="18" stroke={color} strokeWidth="1" opacity="0.25" />
  </svg>
);

const RoofIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 35 L35 8 L65 35" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    <rect x="15" y="35" width="40" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.35" />
    <rect x="30" y="36" width="10" height="9" rx="1" stroke={color} strokeWidth="1" opacity="0.3" />
    <line x1="35" y1="4" x2="35" y2="8" stroke={color} strokeWidth="1.5" opacity="0.4" />
    <rect x="35" y="2" width="8" height="4" rx="1" stroke={color} strokeWidth="1" opacity="0.3" />
  </svg>
);

const DoorIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="30" height="50" rx="4" stroke={color} strokeWidth="1.5" opacity="0.5" />
    <circle cx="28" cy="32" r="2.5" stroke={color} strokeWidth="1.2" opacity="0.45" />
    <rect x="10" y="8" width="20" height="8" rx="2" stroke={color} strokeWidth="1" opacity="0.25" fill={color} fillOpacity="0.04" />
    <line x1="20" y1="18" x2="20" y2="55" stroke={color} strokeWidth="0.8" opacity="0.15" />
  </svg>
);

export const AuthBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const iconColor = theme === 'dark'
    ? 'rgba(120, 143, 255, 0.45)'
    : 'rgba(72, 89, 255, 0.3)';

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = (e.clientX - rect.left - centerX) / centerX;
    const y = (e.clientY - rect.top - centerY) / centerY;
    setOffset({ x, y });
  }, []);

  const layers: ParallaxLayer[] = [
    {
      speed: 12,
      icons: [
        { id: 'dorm1', x: 8, y: 12, size: 90, rotation: -8, animDelay: '0s', component: <DormitoryIcon color={iconColor} size={90} /> },
        { id: 'roof1', x: 82, y: 65, size: 75, rotation: 5, animDelay: '2s', component: <RoofIcon color={iconColor} size={75} /> },
        { id: 'bed1', x: 65, y: 10, size: 65, rotation: 12, animDelay: '4s', component: <BedIcon color={iconColor} size={65} /> },
      ]
    },
    {
      speed: 22,
      icons: [
        { id: 'key1', x: 85, y: 18, size: 50, rotation: -15, animDelay: '1s', component: <KeyIcon color={iconColor} size={50} /> },
        { id: 'window1', x: 12, y: 72, size: 55, rotation: 8, animDelay: '3s', component: <WindowIcon color={iconColor} size={55} /> },
        { id: 'door1', x: 50, y: 80, size: 45, rotation: -5, animDelay: '5s', component: <DoorIcon color={iconColor} size={45} /> },
      ]
    },
    {
      speed: 35,
      icons: [
        { id: 'dorm2', x: 75, y: 40, size: 70, rotation: 10, animDelay: '1.5s', component: <DormitoryIcon color={iconColor} size={70} /> },
        { id: 'window2', x: 20, y: 42, size: 40, rotation: -12, animDelay: '3.5s', component: <WindowIcon color={iconColor} size={40} /> },
      ]
    },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen overflow-hidden"
    >
      {/* Animated SVG background layers */}
      {layers.map((layer, layerIdx) => (
        <div
          key={layerIdx}
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${-offset.x * layer.speed}px, ${-offset.y * layer.speed}px)`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {layer.icons.map((icon) => (
            <div
              key={icon.id}
              className="absolute nm-float-slow"
              style={{
                left: `${icon.x}%`,
                top: `${icon.y}%`,
                transform: `rotate(${icon.rotation}deg)`,
                animationDelay: icon.animDelay,
                animationDuration: `${8 + layerIdx * 4}s`,
              }}
            >
              {icon.component}
            </div>
          ))}
        </div>
      ))}

      {/* Soft radial glow accents */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: theme === 'dark'
            ? 'radial-gradient(600px 400px at 30% 20%, rgba(120, 143, 255, 0.06), transparent 70%), radial-gradient(500px 350px at 70% 70%, rgba(140, 100, 255, 0.04), transparent 70%)'
            : 'radial-gradient(600px 400px at 30% 20%, rgba(72, 89, 255, 0.06), transparent 70%), radial-gradient(500px 350px at 70% 70%, rgba(160, 100, 255, 0.04), transparent 70%)',
          transition: 'background 0.4s ease',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;
