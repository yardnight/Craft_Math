import React from 'react';

interface CreeperStreakIconProps {
  className?: string;
  size?: number; // Optional size multiplier
}

export const CreeperStreakIcon: React.FC<CreeperStreakIconProps> = ({ 
  className = '',
  size = 4
}) => {
  // Pass --c-size CSS variable to set individual pixel size dynamically.
  // Defaulting to 4px.
  const pixelSize = `${size}px`;

  return (
    <div 
      id="creeper-streak-icon"
      className={`inline-block relative shrink-0 select-none ${className}`}
      style={{
        width: `calc(8 * var(--c-size, ${pixelSize}))`,
        height: `calc(8 * var(--c-size, ${pixelSize}))`,
        backgroundColor: '#39bc33',
        transition: 'all 0.2s ease-in-out',
        imageRendering: 'pixelated',
        '--c-size': pixelSize,
      } as React.CSSProperties}
    >
      <div
        style={{
          position: 'absolute',
          width: 'var(--c-size)',
          height: 'var(--c-size)',
          left: 0,
          top: 0,
          backgroundColor: 'transparent',
          boxShadow: `
            calc(1 * var(--c-size)) calc(2 * var(--c-size)) 0 #000,
            calc(2 * var(--c-size)) calc(2 * var(--c-size)) 0 #000,
            calc(5 * var(--c-size)) calc(2 * var(--c-size)) 0 #000,
            calc(6 * var(--c-size)) calc(2 * var(--c-size)) 0 #000,

            calc(1 * var(--c-size)) calc(3 * var(--c-size)) 0 #000,
            calc(2 * var(--c-size)) calc(3 * var(--c-size)) 0 #000,
            calc(5 * var(--c-size)) calc(3 * var(--c-size)) 0 #000,
            calc(6 * var(--c-size)) calc(3 * var(--c-size)) 0 #000,

            calc(3 * var(--c-size)) calc(4 * var(--c-size)) 0 #000,
            calc(4 * var(--c-size)) calc(4 * var(--c-size)) 0 #000,

            calc(2 * var(--c-size)) calc(5 * var(--c-size)) 0 #000,
            calc(3 * var(--c-size)) calc(5 * var(--c-size)) 0 #000,
            calc(4 * var(--c-size)) calc(5 * var(--c-size)) 0 #000,
            calc(5 * var(--c-size)) calc(5 * var(--c-size)) 0 #000,

            calc(2 * var(--c-size)) calc(6 * var(--c-size)) 0 #000,
            calc(3 * var(--c-size)) calc(6 * var(--c-size)) 0 #000,
            calc(4 * var(--c-size)) calc(6 * var(--c-size)) 0 #000,
            calc(5 * var(--c-size)) calc(6 * var(--c-size)) 0 #000,

            calc(2 * var(--c-size)) calc(7 * var(--c-size)) 0 #000,
            calc(5 * var(--c-size)) calc(7 * var(--c-size)) 0 #000
          `,
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </div>
  );
};
