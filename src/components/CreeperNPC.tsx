import React, { useRef, useEffect } from 'react';
import './CreeperNPC.css';

interface CreeperNPCProps {
  size?: number;
  isPrimed?: boolean;   
  className?: string;
}

const SPRITE: number[][] = [
  // Голова (рядки 0-14)
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 1, 6, 1, 2, 1, 5, 1, 2, 6, 1, 2, 1, 0],
  [0, 1, 6, 5, 2, 1, 2, 1, 6, 1, 2, 6, 1, 5, 0],
  [0, 2, 1, 2, 1, 6, 5, 2, 1, 6, 1, 2, 6, 1, 0],
  [0, 1, 5, 1, 6, 1, 1, 2, 6, 1, 5, 1, 1, 2, 0],
  [0, 2, 1, 3, 3, 3, 1, 6, 1, 3, 3, 3, 2, 1, 0], 
  [0, 1, 6, 3, 3, 3, 2, 1, 5, 3, 3, 3, 1, 6, 0],
  [0, 5, 1, 3, 3, 3, 6, 1, 2, 3, 3, 3, 5, 1, 0],
  [0, 1, 2, 1, 1, 5, 3, 3, 3, 6, 1, 2, 1, 1, 0], 
  [0, 6, 1, 5, 1, 3, 3, 3, 3, 3, 1, 5, 6, 2, 0], 
  [0, 1, 2, 1, 6, 3, 3, 3, 3, 3, 2, 1, 1, 1, 0],
  [0, 2, 1, 6, 1, 3, 1, 5, 1, 3, 1, 6, 2, 1, 0],
  [0, 1, 5, 1, 2, 1, 6, 1, 2, 1, 5, 1, 1, 6, 0],
  [0, 6, 1, 2, 1, 5, 1, 2, 1, 6, 1, 2, 5, 1, 0],
  [0, 2, 1, 6, 1, 1, 2, 1, 6, 1, 1, 2, 1, 6, 0],
  // Тулуб (рядки 15-23)
  [0, 0, 0, 0, 4, 6, 4, 1, 4, 2, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 5, 1, 6, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 6, 1, 2, 1, 5, 1, 6, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 5, 1, 6, 1, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 1, 6, 1, 2, 1, 5, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 6, 5, 2, 1, 6, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 5, 1, 2, 1, 6, 1, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 4, 4, 6, 4, 1, 5, 4, 0, 0, 0, 0],
  [0, 2, 1, 6, 4, 2, 4, 5, 1, 6, 1, 4, 2, 4, 0],
  // Ноги (рядки 24-29)
  [0, 4, 6, 1, 6, 4, 0, 0, 0, 1, 5, 2, 1, 2, 0],
  [0, 4, 1, 4, 2, 6, 0, 0, 0, 6, 1, 6, 1, 5, 0],
  [0, 6, 4, 5, 6, 1, 0, 0, 0, 2, 6, 1, 2, 4, 0],
  [0, 4, 2, 4, 1, 6, 0, 0, 0, 1, 2, 5, 1, 6, 0],
  [0, 4, 3, 4, 3, 2, 0, 0, 0, 6, 3, 1, 3, 4, 0], 
  [0, 3, 4, 3, 4, 0, 0, 0, 0, 3, 5, 3, 1, 0, 0]  
];

const COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#4ca73a', 
  2: '#aedc7b', 
  3: '#14110f', 
  4: '#1b5318', 
  5: '#e1e4a6', 
  6: '#72a75c', 
  7: '#ffffff', 
};

const COLS = SPRITE[0].length;
const ROWS = SPRITE.length;

export const CreeperNPC: React.FC<CreeperNPCProps> = ({
  size = 4,
  isPrimed = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burnMapRef = useRef<number[][] | null>(null);
  const explosionProgressRef = useRef<number>(0);

  const initBurnMap = () => {
    const map = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    const numCenters = 5;
    const centers: { x: number; y: number; startTime: number }[] = [];
    
    for (let i = 0; i < numCenters; i++) {
      centers.push({
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
        startTime: Math.floor(Math.random() * 20) + 50, 
      });
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (SPRITE[y][x] === 0) continue;
        let minBurnTime = 999;
        centers.forEach((center) => {
          const dx = x - center.x;
          const dy = y - center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const burnTime = center.startTime + distance * 2.5 + Math.random() * 2;
          if (burnTime < minBurnTime) minBurnTime = burnTime;
        });
        map[y][x] = minBurnTime;
      }
    }
    burnMapRef.current = map;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = Math.max(1, Math.floor(size));
    canvas.width = COLS * p;
    canvas.height = ROWS * p;
    ctx.imageSmoothingEnabled = false;

    let animationId: number;

    if (isPrimed) {
      if (!burnMapRef.current) {
        initBurnMap();
      }
      if (explosionProgressRef.current >= 100) {
        explosionProgressRef.current = 0;
      }
    }
    if (!isPrimed) {
      burnMapRef.current = null;
      explosionProgressRef.current = 0;
      canvas.style.transform = `scale(1)`;
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const currentProgress = explosionProgressRef.current;
      const burnMap = burnMapRef.current;

      // ГЕНЕРАЦІЯ ШУМУ ДЛЯ ТРЯСКИ (Тільки на Фазі 1: progress < 50)
      let shakeX = 0;
      let shakeY = 0;
      if (isPrimed && currentProgress < 50) {
        // Зміщення на -1, 0 або 1 піксель для створення вібрації
        shakeX = Math.floor(Math.random() * 3) - 1;
        shakeY = Math.floor(Math.random() * 3) - 1;
      }

      // === ДИНАМІЧНИЙ МАСШТАБ (Збільшується ТІЛЬКИ після 50%) ===
      if (isPrimed) {
        if (currentProgress < 50) {
          canvas.style.transform = `scale(1)`;
        } else {
          const swellProgress = (currentProgress - 50) / 50; 
          const scale = 1 + swellProgress * 0.32; 
          canvas.style.transform = `scale(${scale})`;
        }
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const v = SPRITE[y]?.[x] ?? 0;
          if (v === 0) continue;

          let color = COLORS[v];

          if (isPrimed) {
            // === ФАЗА 1: МИГОТІННЯ (0 - 50) ===
            if (currentProgress < 50) {
              const flashFrequency = 0.88 - (currentProgress / 100) * 0.3;
              if (Math.random() > flashFrequency) {
                color = COLORS[7]; 
              }
            }
            // === ФАЗА 2: РОЗПАД ПІКСЕЛІВ (50 - 100) ===
            else if (burnMap) {
              const pixelBurnTime = burnMap[y][x];
              if (currentProgress < pixelBurnTime) {
                if (Math.random() > 0.6) color = COLORS[7]; 
              } else if (currentProgress >= pixelBurnTime && currentProgress < pixelBurnTime + 3) {
                color = COLORS[7]; 
              } else {
                continue; 
              }
            }
          }

          ctx.fillStyle = color;
          // Додаємо зміщення shakeX та shakeY безпосередньо до координат малювання кожного пікселя!
          ctx.fillRect(x * p + (shakeX * p), y * p + (shakeY * p), p, p);
        }
      }

      if (isPrimed && currentProgress < 100) {
        explosionProgressRef.current += 2.2;
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [size, isPrimed]);

  return (
    <canvas
      ref={canvasRef}
      className={`creeper-npc-canvas ${className}`}
    />
  );
};
