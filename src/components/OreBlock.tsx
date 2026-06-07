import React, { useRef, useEffect, useState } from "react";

interface OreBlockProps {
  oreColor: string;          // Main hex color of the ore (e.g. #3fc1c9 for diamond, #f3c623 for gold)
  oreType?: string;          // Precise mining ore label for custom highlight/border styles
  isNether?: boolean;        // True if mining in the Nether World, changing the rock to Netherrack
  answeredCorrectly?: boolean; // True if cracked, adding fissure overlay
  size?: number;             // Pass optional manual size or automatically fit container
}

// High-fidelity non-linear noise matrices to perfectly replicate authentic Minecraft stone textures on all 3 planes
const TOP_STONE_NOISE = [
  [3,0,1,0,2,0,0,1,0,3,0,2,0,1,0,2],
  [0,2,0,3,0,1,2,0,3,0,1,0,2,0,3,0],
  [1,0,2,0,3,0,1,2,0,2,0,3,0,1,0,1],
  [0,3,0,1,0,2,0,0,1,0,3,0,2,0,2,0],
  [2,0,3,0,1,0,3,1,0,2,0,1,0,3,0,3],
  [0,1,0,2,0,3,0,2,3,0,1,0,2,0,1,0],
  [3,0,2,0,1,0,2,0,0,1,0,3,0,2,0,2],
  [0,3,0,3,0,1,3,1,2,0,3,0,1,0,3,0],
  [1,0,1,0,2,0,0,2,0,1,0,2,0,2,0,1],
  [0,2,0,3,0,1,3,0,3,0,3,0,1,0,3,0],
  [3,0,1,0,2,0,1,2,0,2,0,3,0,2,0,2],
  [0,3,0,2,0,1,0,0,1,0,1,0,2,0,1,0],
  [2,0,3,0,3,0,2,3,0,3,0,1,0,3,0,3],
  [0,1,0,1,0,2,0,1,2,0,2,0,3,0,2,0],
  [3,0,2,0,1,0,3,0,0,1,0,1,0,1,0,1],
  [0,2,0,3,0,2,0,2,3,0,3,0,2,0,3,0]
];

const LEFT_STONE_NOISE = [
  [0,3,0,1,0,2,0,0,1,0,3,0,2,0,2,0],
  [2,0,3,0,1,0,3,1,0,2,0,1,0,3,0,3],
  [0,1,0,2,0,3,0,2,3,0,1,0,2,0,1,0],
  [3,0,1,0,2,0,0,1,0,3,0,2,0,1,0,2],
  [0,2,0,3,0,1,2,0,3,0,1,0,2,0,3,0],
  [1,0,2,0,3,0,1,2,0,2,0,3,0,1,0,1],
  [1,0,1,0,2,0,0,2,0,1,0,2,0,2,0,1],
  [0,2,0,3,0,1,3,0,3,0,3,0,1,0,3,0],
  [3,0,1,0,2,0,1,2,0,2,0,3,0,2,0,2],
  [3,0,2,0,1,0,2,0,0,1,0,3,0,2,0,2],
  [0,3,0,3,0,1,3,1,2,0,3,0,1,0,3,0],
  [0,3,0,2,0,1,0,0,1,0,1,0,2,0,1,0],
  [3,0,2,0,1,0,3,0,0,1,0,1,0,1,0,1],
  [0,2,0,3,0,2,0,2,3,0,3,0,2,0,3,0],
  [2,0,3,0,3,0,2,3,0,3,0,1,0,3,0,3],
  [0,1,0,1,0,2,0,1,2,0,2,0,3,0,2,0]
];

const RIGHT_STONE_NOISE = [
  [1,0,2,0,3,0,1,2,0,2,0,3,0,1,0,1],
  [0,3,0,1,0,2,0,0,1,0,3,0,2,0,2,0],
  [3,0,1,0,2,0,0,1,0,3,0,2,0,1,0,2],
  [0,2,0,3,0,1,2,0,3,0,1,0,2,0,3,0],
  [0,1,0,2,0,3,0,2,3,0,1,0,2,0,1,0],
  [3,0,2,0,1,0,2,0,0,1,0,3,0,2,0,2],
  [0,3,0,3,0,1,3,1,2,0,3,0,1,0,3,0],
  [2,0,3,0,1,0,3,1,0,2,0,1,0,3,0,3],
  [3,0,1,0,2,0,1,2,0,2,0,3,0,2,0,2],
  [0,3,0,2,0,1,0,0,1,0,1,0,2,0,1,0],
  [1,0,1,0,2,0,0,2,0,1,0,2,0,2,0,1],
  [0,2,0,3,0,1,3,0,3,0,3,0,1,0,3,0],
  [0,1,0,1,0,2,0,1,2,0,2,0,3,0,2,0],
  [3,0,2,0,1,0,3,0,0,1,0,1,0,1,0,1],
  [0,2,0,3,0,2,0,2,3,0,3,0,2,0,3,0],
  [2,0,3,0,3,0,2,3,0,3,0,1,0,3,0,3]
];

interface OrePixel {
  col: number;
  row: number;
  type: "base" | "light" | "dark";
  sparkleIndex?: number; // if defined, this pixel glows dynamically!
}

export default function OreBlock({
  oreColor,
  oreType = "diamond",
  isNether = false,
  answeredCorrectly = false,
  size
}: OreBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 200 });

  // Use a mutable ref to store the latest props so the animation loop always reads fresh state without restarting
  const propsRef = useRef({ oreColor, oreType, isNether, answeredCorrectly });
  useEffect(() => {
    propsRef.current = { oreColor, oreType, isNether, answeredCorrectly };
  }, [oreColor, oreType, isNether, answeredCorrectly]);

  // 1. Resize Observer to auto-fit container perfectly on any display size
  useEffect(() => {
    if (size) {
      setDimensions({ width: size, height: size });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const s = Math.min(rect.width, rect.height) || 200;
      setDimensions({ width: s, height: s });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [size]);

  // 2. High-fidelity isometric animation rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const startTime = performance.now();

    // Defined ore vein patterns on each face matching the reference image's layout
    const topOrePixels: OrePixel[] = [
      { col: 7, row: 10, type: "base", sparkleIndex: 0 },
      { col: 8, row: 10, type: "light", sparkleIndex: 12 },
      { col: 9, row: 10, type: "base", sparkleIndex: 13 },
      { col: 8, row: 11, type: "light", sparkleIndex: 14 },
      { col: 9, row: 11, type: "base", sparkleIndex: 15 },
      { col: 7, row: 12, type: "dark" },

      // Cluster 5
      { col: 2, row: 8, type: "dark" },
      { col: 3, row: 8, type: "base", sparkleIndex: 46 },
      { col: 2, row: 9, type: "light", sparkleIndex: 47 },
      { col: 3, row: 9, type: "base", sparkleIndex: 48 },

      // Cluster 6
      { col: 12, row: 11, type: "dark" },
      { col: 13, row: 11, type: "base", sparkleIndex: 49 },
      { col: 12, row: 12, type: "light", sparkleIndex: 50 },
      { col: 13, row: 12, type: "base", sparkleIndex: 51 },

      // Cluster 7
      { col: 7, row: 1, type: "dark" },
      { col: 8, row: 1, type: "base", sparkleIndex: 66 },
      { col: 7, row: 2, type: "light", sparkleIndex: 67 },
      { col: 8, row: 2, type: "base", sparkleIndex: 68 },

      { col: 3, row: 4, type: "dark" },
      { col: 4, row: 4, type: "base", sparkleIndex: 16 },
      { col: 5, row: 4, type: "light", sparkleIndex: 1 },
      { col: 4, row: 5, type: "light", sparkleIndex: 17 },
      { col: 3, row: 5, type: "base", sparkleIndex: 18 },

      { col: 11, row: 3, type: "dark" },
      { col: 12, row: 3, type: "base", sparkleIndex: 19 },
      { col: 13, row: 3, type: "light", sparkleIndex: 2 },
      { col: 12, row: 4, type: "light", sparkleIndex: 20 },
      { col: 13, row: 4, type: "base", sparkleIndex: 21 },

      { col: 10, row: 7, type: "dark" },
      { col: 11, row: 7, type: "base", sparkleIndex: 22 },
      { col: 9, row: 8, type: "light", sparkleIndex: 3 },
      { col: 10, row: 8, type: "base", sparkleIndex: 23 }
    ];

    const leftOrePixels: OrePixel[] = [
      // Cluster 1 (Upper Left-middle)
      { col: 4, row: 5, type: "base", sparkleIndex: 24 },
      { col: 5, row: 5, type: "light", sparkleIndex: 4 },
      { col: 3, row: 6, type: "dark" },
      { col: 4, row: 6, type: "light", sparkleIndex: 25 },
      { col: 5, row: 6, type: "base", sparkleIndex: 26 },

      // Cluster 2 (Middle Left)
      { col: 3, row: 7, type: "base", sparkleIndex: 27 },
      { col: 4, row: 7, type: "light", sparkleIndex: 28 },
      { col: 5, row: 7, type: "dark" },
      { col: 3, row: 8, type: "base", sparkleIndex: 29 },
      { col: 4, row: 8, type: "dark" },

      // Cluster 3 (Lower Left-middle)
      { col: 3, row: 9, type: "base", sparkleIndex: 30 },
      { col: 2, row: 10, type: "base", sparkleIndex: 31 },
      { col: 3, row: 10, type: "light", sparkleIndex: 32 },
      { col: 2, row: 11, type: "light", sparkleIndex: 5 },
      { col: 3, row: 11, type: "dark" },
      { col: 2, row: 12, type: "dark" },

      // Cluster 4 (Center-Right vein)
      { col: 10, row: 7, type: "dark" },
      { col: 11, row: 8, type: "base", sparkleIndex: 33 },
      { col: 12, row: 8, type: "light", sparkleIndex: 6 },
      { col: 11, row: 9, type: "base", sparkleIndex: 34 },
      { col: 10, row: 10, type: "dark" },

      // Cluster 5 (Lower-Left vein)
      { col: 1, row: 13, type: "dark" },
      { col: 2, row: 13, type: "base", sparkleIndex: 35 },
      { col: 3, row: 13, type: "light", sparkleIndex: 7 },
      { col: 2, row: 14, type: "dark" },

      // Cluster 6 (New Top-left vein)
      { col: 1, row: 3, type: "dark" },
      { col: 2, row: 3, type: "base", sparkleIndex: 52 },
      { col: 1, row: 4, type: "light", sparkleIndex: 53 },
      { col: 2, row: 4, type: "base", sparkleIndex: 54 },

      // Cluster 7 (New Top-middle vein)
      { col: 7, row: 2, type: "dark" },
      { col: 8, row: 2, type: "base", sparkleIndex: 55 },
      { col: 7, row: 3, type: "light", sparkleIndex: 56 },
      { col: 8, row: 3, type: "base", sparkleIndex: 57 }
    ];

    const rightOrePixels: OrePixel[] = [
      // Cluster 1 (Upper Right vein)
      { col: 11, row: 5, type: "dark" },
      { col: 12, row: 5, type: "base", sparkleIndex: 36 },
      { col: 13, row: 5, type: "light", sparkleIndex: 8 },
      { col: 12, row: 6, type: "base", sparkleIndex: 37 },
      { col: 13, row: 7, type: "dark" },

      // Cluster 2 (Lower central vein)
      { col: 8, row: 10, type: "dark" },
      { col: 9, row: 10, type: "base", sparkleIndex: 38 },
      { col: 10, row: 10, type: "light", sparkleIndex: 9 },
      { col: 9, row: 11, type: "light", sparkleIndex: 39 },
      { col: 10, row: 11, type: "base", sparkleIndex: 40 },
      { col: 9, row: 12, type: "dark" },
      { col: 11, row: 12, type: "dark" },

      // Cluster 3 (Lower Left vein)
      { col: 1, row: 11, type: "dark" },
      { col: 2, row: 11, type: "base", sparkleIndex: 41 },
      { col: 3, row: 11, type: "light", sparkleIndex: 10 },
      { col: 2, row: 12, type: "base", sparkleIndex: 42 },
      { col: 3, row: 12, type: "dark" },

      // Cluster 4 (Middle Right cluster)
      { col: 6, row: 8, type: "dark" },
      { col: 7, row: 8, type: "base", sparkleIndex: 43 },
      { col: 8, row: 8, type: "light", sparkleIndex: 11 },
      { col: 7, row: 9, type: "light", sparkleIndex: 44 },
      { col: 8, row: 9, type: "base", sparkleIndex: 45 },
      { col: 9, row: 9, type: "dark" },

      // Cluster 5 (New Top-Left cluster)
      { col: 3, row: 3, type: "dark" },
      { col: 4, row: 3, type: "base", sparkleIndex: 60 },
      { col: 3, row: 4, type: "light", sparkleIndex: 61 },
      { col: 4, row: 4, type: "base", sparkleIndex: 62 },

      // Cluster 6 (New Lower-Right cluster)
      { col: 13, row: 11, type: "dark" },
      { col: 14, row: 11, type: "base", sparkleIndex: 63 },
      { col: 13, row: 12, type: "light", sparkleIndex: 64 },
      { col: 14, row: 12, type: "base", sparkleIndex: 65 },

      // Cluster 7 (New Top-Middle cluster)
      { col: 8, row: 1, type: "dark" },
      { col: 9, row: 1, type: "base", sparkleIndex: 70 },
      { col: 8, row: 2, type: "light", sparkleIndex: 71 },
      { col: 9, row: 2, type: "base", sparkleIndex: 72 }
    ];

    // Helper to calculate shade variations of the ore color
    const getShades = (hex: string) => {
      const type = propsRef.current.oreType;
      
      // 1. If Copper ("copper"): Beautiful dual-shaded copper ore with patina
      if (type === "copper") {
        return {
          base: "#e27244",  // Radiant copper orange
          light: "#26a69a", // Beautiful turquoise/green oxidized patina
          dark: "#a34e32"   // Dark raw copper orange
        };
      }
      
      // 2. If Lapis Lazuli ("lapis"): Deep rich indigo/royal blue shades
      if (type === "lapis") {
        return {
          base: "#1155cc",  // Royal Blue
          light: "#4ea2ff", // Bright sapphire highlight
          dark: "#0a2d8a"   // Shadowed cobalt blue
        };
      }

      // 3. If Redstone ("redstone"): Brilliant glowing ruby red shades
      if (type === "redstone") {
        return {
          base: "#ff2222",  // Redstone red
          light: "#ff7777", // Brilliant glowing redstone highlight
          dark: "#990000"   // Crimson red shadow
        };
      }

      // 4. If Emerald ("emerald"): Crystalline minty green shades
      if (type === "emerald") {
        return {
          base: "#00e676",  // Vivid green emerald
          light: "#abfff0", // Crystalline emerald glow
          dark: "#007b3a"   // Shadowed rich green emerald
        };
      }

      // 5. If Quartz ("quartz"): Warm cream white quartz
      if (type === "quartz") {
        return {
          base: "#eceff1",  // Cream white quartz
          light: "#ffffff", // Pure glistening white quartz
          dark: "#cfd8dc"   // Soft gray quartz shadow
        };
      }

      let c = hex.replace("#", "");
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);

      // Light shade (highlight center)
      const rl = Math.min(255, r + 60);
      const gl = Math.min(255, g + 60);
      const bl = Math.min(255, b + 60);

      // Dark shade (shadow core)
      const rd = Math.max(0, r - 45);
      const gd = Math.max(0, g - 45);
      const bd = Math.max(0, b - 45);

      const toHex = (num: number) => {
        const val = Math.floor(num).toString(16);
        return val.length === 1 ? "0" + val : val;
      };

      return {
        base: hex,
        light: `#${toHex(rl)}${toHex(gl)}${toHex(bl)}`,
        dark: `#${toHex(rd)}${toHex(gd)}${toHex(bd)}`
      };
    };

    // Blend standard hex color with dynamic glowing neon white
    const blendToGlow = (hexColor: string, pulse: number) => {
      if (pulse <= 0.1) return hexColor;
      let c = hexColor.replace("#", "");
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);

      const p = (pulse - 0.1) / 0.9; // Normalize pulse range
      const rf = Math.min(255, r + (255 - r) * p * 0.95);
      const gf = Math.min(255, g + (255 - g) * p * 0.95);
      const bf = Math.min(255, b + (255 - b) * p * 0.95);

      const toHex = (num: number) => {
        const val = Math.floor(num).toString(16);
        return val.length === 1 ? "0" + val : val;
      };
      return `#${toHex(rf)}${toHex(gf)}${toHex(bf)}`;
    };

    const render = () => {
      const timeMs = performance.now() - startTime;
      const { width, height } = dimensions;
      const dpr = window.devicePixelRatio || 1;

      // Ensure canvas backing store matches correct size & DPR
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
      }

      ctx.clearRect(0, 0, width, height);

      const currentProps = propsRef.current;
      const shades = getShades(currentProps.oreColor);

      // Define standard geometric parameters for a true cube looking vertical and neat
      const side = width * 0.45; // Height/depth parameter of the cube
      const dx = side * 0.866;   // Outer width component (cos 30°)
      const dy = side * 0.50;    // Outer top vertical slope component (sin 30°)
      const cx = width / 2;
      const cy_block = height / 2 - side / 2; // Center block vertically

      // Defining Stone background color and its noise textures matching standard Minecraft block
      const stoneTop = currentProps.isNether ? "#501d1d" : "#747474";
      const stoneTopMedium = currentProps.isNether ? "#431818" : "#6c6c6c";
      const stoneTopDark = currentProps.isNether ? "#341212" : "#5d5d5d";
      const stoneTopLight = currentProps.isNether ? "#5e2323" : "#838383";

      const stoneLeft = currentProps.isNether ? "#401717" : "#616161";
      const stoneLeftMedium = currentProps.isNether ? "#341212" : "#575757";
      const stoneLeftDark = currentProps.isNether ? "#270d0d" : "#4c4c4c";
      const stoneLeftLight = currentProps.isNether ? "#4e1c1c" : "#707070";

      const stoneRight = currentProps.isNether ? "#301010" : "#4e4e4e";
      const stoneRightMedium = currentProps.isNether ? "#250c0c" : "#444444";
      const stoneRightDark = currentProps.isNether ? "#1a0808" : "#3b3b3b";
      const stoneRightLight = currentProps.isNether ? "#3c1414" : "#5c5c5c";

      // Interpolation Helpers for true 3D isometric pixels
      const getTopPlaneCoords = (u: number, v: number) => {
        return {
          x: cx - u * dx + v * dx,
          y: cy_block - dy + u * dy + v * dy
        };
      };

      const getLeftPlaneCoords = (u: number, v: number) => {
        return {
          x: cx - dx + u * dx,
          y: cy_block + u * dy + v * side
        };
      };

      const getRightPlaneCoords = (u: number, v: number) => {
        return {
          x: cx + u * dx,
          y: cy_block + dy - u * dy + v * side
        };
      };

      // 1. DRAW BASE BLOCK FACES
      // TOP FACE
      ctx.fillStyle = stoneTop;
      ctx.beginPath();
      ctx.moveTo(cx, cy_block - dy);
      ctx.lineTo(cx + dx, cy_block);
      ctx.lineTo(cx, cy_block + dy);
      ctx.lineTo(cx - dx, cy_block);
      ctx.closePath();
      ctx.fill();

      // LEFT FACE
      ctx.fillStyle = stoneLeft;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy_block);
      ctx.lineTo(cx, cy_block + dy);
      ctx.lineTo(cx, cy_block + dy + side);
      ctx.lineTo(cx - dx, cy_block + side);
      ctx.closePath();
      ctx.fill();

      // RIGHT FACE
      ctx.fillStyle = stoneRight;
      ctx.beginPath();
      ctx.moveTo(cx, cy_block + dy);
      ctx.lineTo(cx + dx, cy_block);
      ctx.lineTo(cx + dx, cy_block + side);
      ctx.lineTo(cx, cy_block + dy + side);
      ctx.closePath();
      ctx.fill();

      // 2. DRAW STONE BASE NOISE (PIXEL-ART BACKGROUND TEXTURE)
      const drawPlanePixel = (
        col: number,
        row: number,
        plane: "top" | "left" | "right",
        color: string
      ) => {
        const u0 = col / 16;
        const u1 = (col + 1) / 16;
        const v0 = row / 16;
        const v1 = (row + 1) / 16;

        let p0, p1, p2, p3;
        if (plane === "top") {
          p0 = getTopPlaneCoords(u0, v0);
          p1 = getTopPlaneCoords(u1, v0);
          p2 = getTopPlaneCoords(u1, v1);
          p3 = getTopPlaneCoords(u0, v1);
        } else if (plane === "left") {
          p0 = getLeftPlaneCoords(u0, v0);
          p1 = getLeftPlaneCoords(u1, v0);
          p2 = getLeftPlaneCoords(u1, v1);
          p3 = getLeftPlaneCoords(u0, v1);
        } else {
          p0 = getRightPlaneCoords(u0, v0);
          p1 = getRightPlaneCoords(u1, v0);
          p2 = getRightPlaneCoords(u1, v1);
          p3 = getRightPlaneCoords(u0, v1);
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
      };

      // Draw high-fidelity, handcrafted non-linear stone noise matrices for true organic pixel-art depth
      const getNoiseColor = (level: number, base: string, med: string, dark: string, light: string) => {
        if (level === 1) return med;
        if (level === 2) return dark;
        if (level === 3) return light;
        return base;
      };

      for (let c = 0; c < 16; c++) {
        for (let r = 0; r < 16; r++) {
          const topLevel = TOP_STONE_NOISE[c][r];
          const leftLevel = LEFT_STONE_NOISE[c][r];
          const rightLevel = RIGHT_STONE_NOISE[c][r];

          drawPlanePixel(c, r, "top", getNoiseColor(topLevel, stoneTop, stoneTopMedium, stoneTopDark, stoneTopLight));
          drawPlanePixel(c, r, "left", getNoiseColor(leftLevel, stoneLeft, stoneLeftMedium, stoneLeftDark, stoneLeftLight));
          drawPlanePixel(c, r, "right", getNoiseColor(rightLevel, stoneRight, stoneRightMedium, stoneRightDark, stoneRightLight));
        }
      }

      // 3. DRAW EMBEDDED DYNAMIC ORE PIXELS & SPARKLY PULSES DIRECTLY ON THE CUBE
      const drawOrePixelGrid = (pixel: OrePixel, plane: "top" | "left" | "right") => {
        let baseColor = shades[pixel.type];

        // Apply dynamic blinking glow if sparkleIndex is configured
        if (pixel.sparkleIndex !== undefined && !currentProps.answeredCorrectly) {
          const phase = pixel.sparkleIndex * 400;
          const pulse = 0.5 + 0.5 * Math.sin((timeMs + phase) / 220); // Fast mineral pulse sparkle rate
          baseColor = blendToGlow(baseColor, pulse);
        }

        drawPlanePixel(pixel.col, pixel.row, plane, baseColor);
      };

      // Draw Top, Left, and Right active colored veins
      topOrePixels.forEach(pixel => drawOrePixelGrid(pixel, "top"));
      leftOrePixels.forEach(pixel => drawOrePixelGrid(pixel, "left"));
      rightOrePixels.forEach(pixel => drawOrePixelGrid(pixel, "right"));

      // 4. DRAW CRISP EDGE DEFINITION SEPARATORS
      ctx.strokeStyle = currentProps.isNether ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cx, cy_block - dy);
      ctx.lineTo(cx, cy_block + dy);
      ctx.moveTo(cx - dx, cy_block);
      ctx.lineTo(cx, cy_block + dy);
      ctx.moveTo(cx + dx, cy_block);
      ctx.lineTo(cx, cy_block + dy);
      ctx.stroke();

      // 5. DRAW CRACKED BREAKS AND FISSURES SECTOR OVERLAY IF RESOLVED CORRECTLY
      if (currentProps.answeredCorrectly) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = Math.max(1.5, side * 0.018);
        ctx.lineJoin = "bevel";
        ctx.beginPath();

        // Fractures across top surface
        ctx.moveTo(cx, cy_block - dy);
        ctx.lineTo(cx - dx * 0.4, cy_block - dy * 0.4);
        ctx.lineTo(cx, cy_block + dy * 0.5);
        ctx.lineTo(cx + dx * 0.5, cy_block);
        ctx.lineTo(cx, cy_block - dy);

        // Fractures down left side
        ctx.moveTo(cx - dx, cy_block);
        ctx.lineTo(cx - dx * 0.5, cy_block + dy * 0.4 + side * 0.3);
        ctx.lineTo(cx, cy_block + dy + side * 0.5);
        ctx.lineTo(cx - dx * 0.6, cy_block + side * 0.85);

        // Fractures down right side
        ctx.moveTo(cx, cy_block + dy);
        ctx.lineTo(cx + dx * 0.6, cy_block + side * 0.25);
        ctx.lineTo(cx + dx, cy_block + side * 0.45);
        ctx.lineTo(cx + dx * 0.4, cy_block + side * 0.75);
        ctx.lineTo(cx, cy_block + dy + side);

        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [dimensions]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: "block", 
          width: `${dimensions.width}px`, 
          height: `${dimensions.height}px` 
        }} 
      />
    </div>
  );
}
