'use client';

import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  x: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
  sway: number;
  sizeClass: 'small' | 'medium' | 'large';
}

export default function Snowfall({ count = 150 }: { count?: number }) {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const flakes: Snowflake[] = [];
    for (let i = 0; i < count; i++) {
      // Create varied sizes - more small flakes, fewer large ones
      const sizeRandom = Math.random();
      let size: number;
      let sizeClass: 'small' | 'medium' | 'large';
      
      if (sizeRandom < 0.5) {
        // 50% small flakes (2-4px)
        size = Math.random() * 2 + 2;
        sizeClass = 'small';
      } else if (sizeRandom < 0.85) {
        // 35% medium flakes (4-7px)
        size = Math.random() * 3 + 4;
        sizeClass = 'medium';
      } else {
        // 15% large flakes (7-12px)
        size = Math.random() * 5 + 7;
        sizeClass = 'large';
      }

      flakes.push({
        id: i,
        x: Math.random() * 100,
        size,
        sizeClass,
        opacity: Math.random() * 0.5 + 0.4,
        duration: Math.random() * 15 + 15, // 15-30 seconds to fall (much slower)
        delay: Math.random() * -20, // Stagger start times
        drift: Math.random() * 60 - 30, // Horizontal drift -30 to +30px
        sway: Math.random() * 15 + 5, // Sway amount
      });
    }
    setSnowflakes(flakes);
  }, [count]);

  return (
    <div className="snowfall-container">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className={`snow-particle ${flake.sizeClass}`}
          style={{
            left: `${flake.x}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            ['--drift' as string]: `${flake.drift}px`,
            ['--sway' as string]: `${flake.sway}px`,
          }}
        />
      ))}
    </div>
  );
}
