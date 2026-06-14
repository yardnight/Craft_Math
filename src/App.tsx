/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import OreBlock from './components/OreBlock';
import { CreeperStreakIcon } from './components/CreeperStreakIcon';
import { 
  Volume2, 
  VolumeX, 
  Flame, 
  Trophy, 
  Sparkles, 
  RefreshCcw, 
  ChevronRight, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  ErrorItem as EngineErrorItem,
  getEffectivePools,
  checkPoolTransition,
  generateQuestion as engineGenerateQuestion,
  handleAnswer as engineHandleAnswer,
  getSolveCount,
  getLevelXpBounds,
  calculateLevelFromXp
} from './gameEngine';

// Custom Type Definitions
interface Question {
  factor1Num: number;
  factor2Num: number;
  options: number[];
  answer: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  rotation: number;
  scale: number;
  opacity: number;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface ErrorItem {
  f1: number;
  f2: number;
  cooldownSteps?: number;
}

interface PickaxeType {
  id: string;
  minLevel: number;
  nameEn: string;
  nameUk: string;
  item: string;
  text: string;
  border: string;
  bgColor: string;
  colorH: string;
  colorD: string;
  colorL: string;
  multiplier: number;
}

const PICKAXES: PickaxeType[] = [
  { id: 'wooden', minLevel: 1, nameEn: 'Wooden Pickaxe', nameUk: "Дерев'яне кайло", item: '🪵 ⛏️', text: 'text-amber-400', border: 'border-amber-800', bgColor: 'bg-[#3e2723]', colorH: '#8d5a36', colorD: '#5b3e26', colorL: '#b07c5a', multiplier: 2 },
  { id: 'stone', minLevel: 5, nameEn: 'Stone Pickaxe', nameUk: "Кам'яне кайло", item: '🪨 ⛏️', text: 'text-slate-300', border: 'border-slate-500', bgColor: 'bg-[#37474f]', colorH: '#7d7d7d', colorD: '#4a4a4a', colorL: '#b0b0b0', multiplier: 4 },
  { id: 'copper', minLevel: 10, nameEn: 'Copper Pickaxe', nameUk: "Мідне кайло", item: '🧱 ⛏️', text: 'text-orange-400 font-bold', border: 'border-orange-600', bgColor: 'bg-[#5d4037]', colorH: '#d06848', colorD: '#9c4021', colorL: '#fca480', multiplier: 5 },
  { id: 'iron', minLevel: 15, nameEn: 'Iron Pickaxe', nameUk: "Залізне кайло", item: '🪙 ⛏️', text: 'text-slate-100 font-black', border: 'border-slate-250', bgColor: 'bg-[#455a64]', colorH: '#cbd5d6', colorD: '#8e9a9c', colorL: '#ffffff', multiplier: 6 },
  { id: 'diamond', minLevel: 20, nameEn: 'Diamond Pickaxe', nameUk: "Алмазне кайло", item: '💎 ⛏️', text: 'text-cyan-300 font-bold tracking-widest', border: 'border-cyan-400', bgColor: 'bg-[#006064]/40', colorH: '#2cf0eb', colorD: '#0ea7b5', colorL: '#bbfefc', multiplier: 8 },
  { id: 'netherite', minLevel: 25, nameEn: 'Netherite Pickaxe', nameUk: "Незеритове кайло", item: '🖤 ⛏️', text: 'text-purple-400 font-black tracking-widest', border: 'border-purple-600', bgColor: 'bg-[#4a148c]/30', colorH: '#4a3b47', colorD: '#2b2029', colorL: '#796775', multiplier: 9 },
  { id: 'gold', minLevel: 30, nameEn: 'Golden Pickaxe', nameUk: "Золоте кайло", item: '⭐ ⛏️', text: 'text-yellow-300 font-bold', border: 'border-yellow-400', bgColor: 'bg-[#fbc02d]/20', colorH: '#facd34', colorD: '#c29415', colorL: '#fff6a1', multiplier: 12 },
];

// Inline styles for 8-bit aesthetic and keyframe animations
const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Share+Tech+Mono&display=swap');

  .font-pixel {
    font-family: 'Press Start 2P', monospace;
    font-smooth: never;
    -webkit-font-smoothing: none;
  }

  .font-tech {
    font-family: 'Share Tech Mono', monospace;
  }

  /* Vibrant Palette custom theme styles */
  .pixel-border {
    border: 4px solid #000;
    box-shadow: inset -2px -2px 0 0 rgba(0,0,0,0.5), inset 2px 2px 0 0 rgba(255,255,255,0.2);
  }
  @media (min-width: 640px) {
    .pixel-border {
      border: 8px solid #000;
      box-shadow: inset -4px -4px 0 0 rgba(0,0,0,0.5), inset 4px 4px 0 0 rgba(255,255,255,0.2);
    }
  }

  .bg-pixel-grid {
    background-color: #1e1e1e;
    background-image: 
      linear-gradient(rgba(0,0,0,.3) 2px, transparent 2px),
      linear-gradient(90deg, rgba(0,0,0,.3) 2px, transparent 2px);
    background-size: 64px 64px;
    image-rendering: pixelated;
  }

  .bg-nether-grid {
    background-color: #2d0c0c;
    background-image: 
      linear-gradient(rgba(0,0,0,.65) 2.5px, transparent 2.5px),
      linear-gradient(90deg, rgba(0,0,0,.65) 2.5px, transparent 2.5px),
      radial-gradient(circle at 25% 25%, rgba(239,68,68,0.22) 0%, transparent 55%),
      radial-gradient(circle at 75% 75%, rgba(220,38,38,0.25) 0%, transparent 65%);
    background-size: 64px 64px, 64px 64px, 100% 100%, 100% 100%;
    image-rendering: pixelated;
  }

  .text-shadow-stat {
    text-shadow: 4px 4px #000;
  }

  .text-shadow-streak {
    text-shadow: 3px 3px #000;
  }

  .text-shadow-problem {
    text-shadow: 6px 6px #000;
  }

  .ore-block {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: none;
  }

  .ore-glint {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 4px solid #000;
  }

  /* Minecraft-like card textures */
  .pixel-stone {
    image-rendering: pixelated;
    background-color: #383838;
    background-image: 
      radial-gradient(#2c2c2c 25%, transparent 25%),
      radial-gradient(#4d4d4d 25%, transparent 25%);
    background-size: 8px 8px;
    background-position: 0 0, 4px 4px;
    border: 6px solid;
    border-color: #555555 #1e1e1e #1e1e1e #555555;
    box-shadow: inset 0 4px 0 rgba(255,255,255,0.1), inset 4px 0 0 rgba(255,255,255,0.1);
  }

  .pixel-border-gold {
    border-color: #f1c40f #d35400 #d35400 #f1c40f;
  }

  .pixel-wood {
    image-rendering: pixelated;
    background-color: #6d4c2b;
    background-image: 
      linear-gradient(90deg, #5a3c1f 50%, transparent 50%),
      linear-gradient(#7c5732 50%, transparent 50%);
    background-size: 16px 16px;
    border: 6px solid;
    border-color: #a07246 #3f2814 #3f2814 #a07246;
    box-shadow: inset 0 4px 0 rgba(255,255,255,0.08);
  }

  .pixel-dirt {
    image-rendering: pixelated;
    background-color: #573d26;
    border: 6px solid;
    border-color: #8c603a #362211 #362211 #8c603a;
  }

  .pixel-grass {
    border-top: 14px solid #3de03d;
  }

  .pixel-neon-border {
    box-shadow: 0 0 16px rgba(50, 220, 220, 0.6);
  }

  /* Active pickaxe swing animation */
  @keyframes swingMine {
    0% { transform: translate(40px, -40px) rotate(-10deg); }
    30% { transform: translate(-30px, 20px) rotate(-85deg); }
    50% { transform: translate(-35px, 25px) rotate(-90deg); }
    100% { transform: translate(40px, -40px) rotate(-10deg); }
  }

  .animate-swing {
    animation: swingMine 0.4s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
  }

  /* Dropdown animations for falling ore block */
  @keyframes dropDown {
    0% { transform: translateY(-400px) scaleY(1.3); opacity: 0; }
    50% { transform: translateY(20px) scaleY(0.9); opacity: 1; }
    75% { transform: translateY(-10px) scaleY(1.05); }
    100% { transform: translateY(0) scaleY(1); }
  }

  .animate-drop {
    animation: dropDown 0.65s cubic-bezier(0.18, 0.89, 0.32, 1.2) forwards;
  }

  /* Shaking red keyframe for error */
  @keyframes shakeGrid {
    0%, 100% { transform: translateX(0) scale(1); }
    15% { transform: translateX(-12px) scale(0.98) rotate(-1.5deg); }
    30% { transform: translateX(10px) scale(1.01) rotate(1deg); }
    45% { transform: translateX(-8px) scale(0.99) rotate(-1deg); }
    60% { transform: translateX(6px) scale(1); }
    75% { transform: translateX(-4px) scale(1); }
  }

  .animate-shake {
    animation: shakeGrid 0.45s ease-in-out;
  }

  /* Floating text animations rise and fade */
  @keyframes floatUpFade {
    0% { transform: translateY(0) scale(0.8); opacity: 0; }
    15% { opacity: 1; transform: translateY(-20px) scale(1.15); }
    100% { transform: translateY(-110px) scale(0.9); opacity: 0; }
  }

  .animate-float-up {
    animation: floatUpFade 1.3s cubic-bezier(0.2, 0.8, 0.25, 1) forwards;
  }

  /* Level up radial shining backdrop */
  @keyframes rotateShine {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .animate-shine {
    animation: rotateShine 12s linear infinite;
  }

  /* Pixel cracks patterns */
  .pixel-cracks {
    background: repeating-linear-gradient(
      45deg,
      rgba(0,0,0,0) 0px,
      rgba(0,0,0,0) 10px,
      rgba(0,0,0,0.4) 11px,
      rgba(0,0,0,0.4) 14px,
      rgba(0,0,0,0) 15px
    );
  }

  /* Footer bar with retro items styling */
  .footer-bar {
    background: #313131;
    border-top: 8px solid #000;
  }
  .xp-bar-bg {
    background: #000;
    border: 4px solid #555;
  }
  .xp-bar-fill {
    background: #55ff55;
    box-shadow: 0 0 10px #55ff55, inset 0 2px 0 rgba(255,255,255,0.2);
  }
  .inventory-slot {
    width: 36px;
    height: 36px;
    background: #8b8b8b;
    border: 3px solid #373737;
    box-shadow: inset -2px -2px 0 0 rgba(0,0,0,0.4), inset 2px 2px 0 0 rgba(255,255,255,0.25);
  }
  @media (min-width: 640px) {
    .inventory-slot {
      width: 48px;
      height: 48px;
      border-width: 4px;
      box-shadow: inset -3px -3px 0 0 rgba(0,0,0,0.4), inset 3px 3px 0 0 rgba(255,255,255,0.25);
    }
  }

  /* Pixelated Range input styling */
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  input[type="range"]:focus {
    outline: none;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    background: #000;
    height: 14px;
    border: 4px solid #555;
    box-shadow: inset -2px -2px 0 0 rgba(255,255,255,0.1), inset 2px 2px 0 0 rgba(0,0,0,0.8);
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 28px;
    background: #c6c6c6;
    border: 4px solid #000;
    box-shadow: inset -3px -3px 0 0 rgba(0,0,0,0.4), inset 3px 3px 0 0 rgba(255,255,255,0.8);
    margin-top: -11px;
    cursor: pointer;
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 28px;
    background: #c6c6c6;
    border: 4px solid #000;
    box-shadow: inset -3px -3px 0 0 rgba(0,0,0,0.4), inset 3px 3px 0 0 rgba(255,255,255,0.8);
    cursor: pointer;
  }
  input[type="range"]::-moz-range-track {
    background: #000;
    height: 14px;
    border: 4px solid #555;
  }
`;

// Game Language Translations Dictionary
const t = {
  en: {
    levelUnlocked: "New Gear Unlocked!",
    continueMining: "Continue Mining!",
    unlockedNewGear: "Unlocked New Mining Gear:",
    gearLevel: "Gear",
    streak: "Streak",
    maxRecord: "Max Record",
    toNextLevel: "TO NEXT LEVEL",
    currentlyMiningWith: "Currently mining with:",
    miningMissions: "Mining Missions",
    missionsDesc: "Incorrect answers are saved here to practice them again. Clear the list to become a master!",
    safeZone: "Safe Zone!",
    allBlocksCleared: "All blocks cleared! Keep digging.",
    weakSpots: "Weak Spots",
    mine: "Mine!",
    statistics: "Statistics",
    blocksMined: "Blocks Mined:",
    currentXp: "Current XP:",
    bestStreak: "Best Streak:",
    resetWorld: "Reset World",
    howToPlayTitle: "How to play:",
    howToPlayDesc: "Click the matching Chest below containing the correct multiplication product to slice the Ore Block and earn XP. Look out for different ore difficulties and build your Streak multiplier!",
    practicingWeakSpot: "Practicing Weak Spot!",
    oreBlock: "Ore Block",
    factorLevel: "Level",
    claimed: "Claimed! ✔️",
    tntBoom: "TNT BOOM! 💣",
    skipBlock: "Skip Block ➡️",
    totalMined: "TOTAL MINED",
    settingsTitle: "Game Settings",
    languageLabel: "Game Language / Мова",
    volumeLabel: "Sound Volume / Гучність",
    closeBtn: "Done / Закрити",
    resetConfirm: "Are you sure you want to reset all your XP, Levels, and high streaks? You will start back with a Wood Pickaxe! 🪵",
    resetBtnTip: "Reset Minecraft World progress stats",
    resetConfirmButton: "Yes, Reset World 🔄",
    cancelConfirmButton: "No, Cancel ❌",
    hiss: "HISS... 💣",
    generatingWorld: "Generating world mesh...",
    hotbar: "HOTBAR",
    diamondMinedTitle: "Blocks of Diamond Mined",
    currentToolsTitle: "Current Pickaxe",
    survivalSupportTitle: "Survival Items / Mining Missions",
    resetWorldTitle: "Reset Minecraft World progress stats",
    systemGearTitle: "Minecraft System Gear",
    languageTitle: "Game Language",
    soundVolume: "Sound Volume",
    doneBtn: "Done / Закрити",
    level: "Level",
    howToPlay: "✨ How to play: Click the matching Chest below containing the correct multiplication product to slice the Ore Block and earn XP. Look out for different ore difficulties and build your Streak multiplier!",
    crackMineralTitle: "Crack to see mineral parts!",
    netherPortalTitle: "Nether Portal Opened!",
    netherPortalDesc: "You have unlocked the Netherite Pickaxe! A mysterious purple portal has opened, crackling with hot obsidian air. Are you ready to enter the Nether World?",
    enterNetherBtn: "Enter Nether World 😈",
    netherWorldActive: "Nether World",
    choosePickaxe: "Pickaxe Selector",
    pickaxeUnlockedAt: "Unlocked at Level",
    pickaxeLocked: "LOCKED 🔒",
    pickaxeEquipped: "EQUIPPED ✔️",
    autoSelect: "Use Best Pickaxe (Auto)"
  },
  uk: {
    levelUnlocked: "Нове спорядження розблоковано!",
    continueMining: "Продовжувати копати!",
    unlockedNewGear: "Розблоковано нове спорядження:",
    gearLevel: "Спорядження",
    streak: "Серія",
    maxRecord: "Рекорд",
    toNextLevel: "ДО НАСТУПНОГО РІВНЯ",
    currentlyMiningWith: "Зараз копаєте:",
    miningMissions: "Шахтарські Місії",
    missionsDesc: "Неправильні відповіді зберігаються тут для повторного тренування. Очисти список, щоб стати майстром!",
    safeZone: "Безпечна Зона!",
    allBlocksCleared: "Всі блоки очищено! Копай далі.",
    weakSpots: "Слабкі місця",
    mine: "Копати!",
    statistics: "Статистика",
    blocksMined: "Видобуто блоків:",
    currentXp: "Поточний досвід:",
    bestStreak: "Найкраща серія:",
    resetWorld: "Скинути Світ",
    howToPlayTitle: "Як грати:",
    howToPlayDesc: "Натисніть на Скриню з правильною відповіддю знизу, щоб розбити блок руди та отримати XP. Зверніть увагу на руди різної складності та накопичуйте множник серії!",
    practicingWeakSpot: "Тренування слабкого місця!",
    oreBlock: "Блок Руди",
    factorLevel: "Рівень",
    claimed: "Видобуто! ✔️",
    tntBoom: "ТНТ БУМ! 💣",
    skipBlock: "Пропустити блок ➡️",
    totalMined: "ВСЬОГО ВИДОБУТО:",
    settingsTitle: "Налаштування гри",
    languageLabel: "Мова гри / Game Language",
    volumeLabel: "Гучність звуку / Sound Volume",
    closeBtn: "Закрити / Done",
    resetConfirm: "Ви впевнені, що хочете скинути свій XP, Рівень і серію рекордів? Ви почнете спочатку з дерев'яним кайлом! 🪵",
    resetBtnTip: "Скинути прогрес у світі Minecraft",
    resetConfirmButton: "Так, скинути світ 🔄",
    cancelConfirmButton: "Ні, скасувати ❌",
    hiss: "ШШШ... 💣",
    generatingWorld: "Генерація сітки світу...",
    hotbar: "СЛОТ",
    diamondMinedTitle: "Видобуто алмазних блоків",
    currentToolsTitle: "Поточне кайло",
    survivalSupportTitle: "Речі для виживання / Шахтарські Місії",
    resetWorldTitle: "Скинути прогрес у світі Minecraft",
    systemGearTitle: "Налаштування системи",
    languageTitle: "Мова гри",
    soundVolume: "Гучність звуку",
    doneBtn: "Закрити / Done",
    level: "Рівень",
    howToPlay: "✨ Як грати: Натисніть на Скриню з правильною відповіддю знизу, щоб розбити блок руди та отримати XP. Зверніть увагу на руди різної складності та накопичуйте множник серії!",
    crackMineralTitle: "Клікни, щоб розбити руду!",
    netherPortalTitle: "Портал в Незер відкрито!",
    netherPortalDesc: "Ви розблокували Незеритове кайло! З'явився таємничий фіолетовий портал, від якого віє гарячим обсидіановим повітрям. Чи готові ви увійти в Незер ворлд?",
    enterNetherBtn: "Увійти в Незер ворлд 😈",
    netherWorldActive: "Незер Ворлд",
    choosePickaxe: "Вибір кайла",
    pickaxeUnlockedAt: "Розблокується на рівні",
    pickaxeLocked: "ЗАБЛОКОВАНО 🔒",
    pickaxeEquipped: "ЕКІПІРОВАНО ✔️",
    autoSelect: "Найкраще кайло (Авто)"
  }
};

const PixelPickaxe = ({ 
  colorH, 
  colorD, 
  colorL, 
  size = 32,
  className = ""
}: { 
  colorH: string; 
  colorD: string; 
  colorL: string; 
  size?: number;
  className?: string;
}) => {
  const grid = [
    "................",
    "......kkkkkkk...",
    "....kkhlllllhkk.",
    "...kklhhhhhhhhdk",
    "...kdk....klhdk.",
    ".........kwlhdk.",
    "........kwslhdk.",
    ".......kwsklhdk.",
    "......kwsk.lhdk.",
    ".....kwsk..lhdk.",
    "....kwsk...kdk..",
    "...kwsk....k....",
    "..kwsk..........",
    ".kwsk...........",
    ".kkk............",
    "................"
  ];

  const rects: React.JSX.Element[] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char === '.') continue;
      
      let fill = '';
      if (char === 'k') fill = '#14110f';
      else if (char === 'w') fill = '#986944';
      else if (char === 's') fill = '#5b3e26';
      else if (char === 'h') fill = colorH;
      else if (char === 'd') fill = colorD;
      else if (char === 'l') fill = colorL;
      
      rects.push(
        <rect 
          key={`${x}-${y}`} 
          x={x} 
          y={y} 
          width={1} 
          height={1} 
          fill={fill} 
        />
      );
    }
  });

  return (
    <svg 
      viewBox="0 0 16 16" 
      width={size} 
      height={size} 
      className={`pixelated-render shrink-0 ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {rects}
    </svg>
  );
};

export default function App() {
  // Global Counters and Progress
  const [xp, setXp] = useState<number>(() => {
    const saved = localStorage.getItem('math_miner_xp');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [streak, setStreak] = useState<number>(0);
  const [highStreak, setHighStreak] = useState<number>(() => {
    const saved = localStorage.getItem('math_miner_high_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [blocksMined, setBlocksMined] = useState<number>(() => {
    const saved = localStorage.getItem('math_miner_blocks_mined');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Language & Volume States
  const [lang, setLang] = useState<'en' | 'uk'>(() => {
    const saved = localStorage.getItem('math_miner_lang');
    return (saved as 'en' | 'uk') || 'en';
  });

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('math_miner_volume');
    return saved ? parseFloat(saved) : 0.5;
  });

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  // Sound preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('math_miner_sound');
    return saved ? saved === 'true' : true;
  });

  // Question, Selection & Mechanics State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean>(false);
  const [isNewQuestionEntry, setIsNewQuestionEntry] = useState<boolean>(true);
  const [failedOptions, setFailedOptions] = useState<number[]>([]);
  const [shakeBlock, setShakeBlock] = useState<boolean>(false);
  const [currentQuestionFromQueue, setCurrentQuestionFromQueue] = useState<boolean>(false);
  const [currentQuestionHasError, setCurrentQuestionHasError] = useState<boolean>(false);

  // Smart Practice Database Support (Error Queue)
  const [errorQueue, setErrorQueue] = useState<ErrorItem[]>(() => {
    const saved = localStorage.getItem('math_miner_error_queue');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          f1: item.f1,
          f2: item.f2,
          cooldownSteps: typeof item.cooldownSteps === 'number' ? item.cooldownSteps : 0
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  // Frequency history counts to reduce duplicate question occurrence probability
  const [historyCounts, setHistoryCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('math_miner_history_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('math_miner_history_counts', JSON.stringify(historyCounts));
  }, [historyCounts]);

  // Level transition observer mapping to the pure physical engine transition conditions
  const prevLevelRef = useRef<number>(1);
  const xpRef = useRef<number>(0);

  // Sync XP changes to update the level milestone check
  useEffect(() => {
    const currentLvl = calculateLevelFromXp(xp);
    const prevLvl = prevLevelRef.current;
    if (currentLvl !== prevLvl) {
      const activeQueue = errorQueue.map(e => ({ f1: e.f1, f2: e.f2, cooldownSteps: e.cooldownSteps ?? 0 }));
      const result = checkPoolTransition(currentLvl, prevLvl, historyCounts, activeQueue);
      if (result.resetTriggered) {
        setHistoryCounts(result.historyCounts);
        setErrorQueue(result.errorQueue);
      }
      if (currentLvl >= 35 && prevLvl < 35) {
        setNetherEntered(true);
      }
    }
    prevLevelRef.current = currentLvl;
  }, [xp, historyCounts, errorQueue]);

  // Particle & text animation vectors
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [pickaxeStrike, setPickaxeStrike] = useState<{ optionIndex: number; x: number; y: number } | null>(null);

  // Level Up triggers
  const [showLevelUpBanner, setShowLevelUpBanner] = useState<number | null>(null);

  const [netherEntered, setNetherEntered] = useState<boolean>(() => {
    return localStorage.getItem('math_miner_nether_entered') === 'true';
  });
  const [showNetherPortalModal, setShowNetherPortalModal] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('math_miner_nether_entered', netherEntered.toString());
  }, [netherEntered]);

  // Active Tool state mapping
  const currentLevel = calculateLevelFromXp(xp);
  
  // Dynamic XP progress calculations
  const bounds = getLevelXpBounds(currentLevel);
  const xpIntoCurrentLevel = xp - bounds.prevTotal;
  const xpRequiredForNextLevel = bounds.req;
  const nextLevelThresholdXp = bounds.prevTotal + bounds.req;
  const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpRequiredForNextLevel) * 100));

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('math_miner_xp', xp.toString());
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('math_miner_high_streak', highStreak.toString());
  }, [highStreak]);

  useEffect(() => {
    localStorage.setItem('math_miner_blocks_mined', blocksMined.toString());
  }, [blocksMined]);

  useEffect(() => {
    localStorage.setItem('math_miner_sound', soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('math_miner_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('math_miner_volume', volume.toString());
  }, [volume]);

  const [selectedPickaxeId, setSelectedPickaxeId] = useState<string | null>(() => {
    return localStorage.getItem('math_miner_selected_pickaxe') || null;
  });

  const [showPickaxeSelector, setShowPickaxeSelector] = useState<boolean>(false);

  useEffect(() => {
    if (selectedPickaxeId) {
      localStorage.setItem('math_miner_selected_pickaxe', selectedPickaxeId);
    } else {
      localStorage.removeItem('math_miner_selected_pickaxe');
    }
  }, [selectedPickaxeId]);

  useEffect(() => {
    localStorage.setItem('math_miner_error_queue', JSON.stringify(errorQueue));
  }, [errorQueue]);

  // Audio Synthesizer Engine (Self-contained, Web Audio API based, 0% 404 chance)
  const playSoundEffect = useCallback((type: 'mine' | 'correct' | 'error' | 'levelUp' | 'portal' | 'click') => {
    if (!soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const volMultiplier = volume;

      if (type === 'mine') {
        // High impact rock impact: rapid low triangle pitch snap with short crunch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        
        gain.gain.setValueAtTime(0.4 * volMultiplier, now);
        gain.gain.exponentialRampToValueAtTime(0.01 * volMultiplier, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.12);

      } else if (type === 'correct') {
        // Pixel achievement ping: rapid C5 - E5 - G5 - C6 chime
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          
          gain.gain.setValueAtTime(0.15 * volMultiplier, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01 * volMultiplier, now + idx * 0.08 + 0.22);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.22);
        });

      } else if (type === 'error') {
        // Creeper Explosion HISS + low-fi bass sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(25, now + 0.35);

        gain.gain.setValueAtTime(0.35 * volMultiplier, now);
        gain.gain.exponentialRampToValueAtTime(0.01 * volMultiplier, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.35);

        // Synth dry noise snap representing the fizzle
        const noiseOsc = ctx.createOscillator();
        const noiseGain = ctx.createGain();
        noiseOsc.type = 'triangle';
        noiseOsc.frequency.setValueAtTime(450, now);
        noiseOsc.frequency.linearRampToValueAtTime(100, now + 0.15);
        noiseGain.gain.setValueAtTime(0.2 * volMultiplier, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01 * volMultiplier, now + 0.15);
        noiseOsc.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseOsc.start();
        noiseOsc.stop(now + 0.15);

      } else if (type === 'levelUp') {
        // Grand voxel level up scale fanfare: C4 - E4 - G4 - C5 - E5 - G5 - C6
        const levelScale = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        levelScale.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          
          gain.gain.setValueAtTime(0.18 * volMultiplier, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.02 * volMultiplier, now + idx * 0.09 + 0.28);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.28);
        });
      } else if (type === 'portal') {
        const sweepScale = [110, 147, 196, 220, 293, 440];
        sweepScale.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.15 + 0.6);
          
          gain.gain.setValueAtTime(0.25 * volMultiplier, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01 * volMultiplier, now + idx * 0.15 + 0.6);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.6);
        });
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

        gain.gain.setValueAtTime(0.08 * volMultiplier, now);
        gain.gain.exponentialRampToValueAtTime(0.01 * volMultiplier, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Audio context block safeguard from browser policies
    }
  }, [soundEnabled, volume]);

  // Game logic configurations mapping current table factor sets to difficulty ores
  const getOreConfig = useCallback((f1: number, f2: number) => {
    const maxVal = Math.max(f1, f2);
    if (maxVal <= 2) {
      return {
        name: lang === 'uk' ? 'Вугільна руда' : 'Coal Ore',
        emoji: '⚫',
        sparkleEmoji: '⚫',
        themeColor: '#383838', // Dark charcoal/coal gray
        oreType: 'coal',
        sparkleColor: '#171717',
        borderColor: '#000000',
        textColor: 'text-zinc-300',
        particle: '⚫',
        xpBonus: 10,
        gradeColor: 'bg-[#555555]'
      };
    } else if (maxVal === 3) {
      return {
        name: lang === 'uk' ? 'Мідна руда' : 'Copper Ore',
        emoji: '🧡',
        sparkleEmoji: '💚',
        themeColor: '#e27244', // Copper orange base (will be dual-shaded with green in OreBlock)
        oreType: 'copper',
        sparkleColor: '#26a69a', // Turquoise green sparkle
        borderColor: '#000000',
        textColor: 'text-amber-200',
        particle: '🧡',
        xpBonus: 11,
        gradeColor: 'bg-[#d9744b]'
      };
    } else if (maxVal === 4) {
      return {
        name: lang === 'uk' ? 'Залізна руда' : 'Iron Ore',
        emoji: '🪙',
        sparkleEmoji: '🟫',
        themeColor: '#ca9e82', // Sandy raw ore
        oreType: 'iron',
        sparkleColor: '#a17255',
        borderColor: '#000000',
        textColor: 'text-orange-100',
        particle: '🟫',
        xpBonus: 12,
        gradeColor: 'bg-[#7a7a7a]'
      };
    } else if (maxVal === 5) {
      return {
        name: lang === 'uk' ? 'Лазуритова руда' : 'Lapis Lazuli Ore',
        emoji: '💙',
        sparkleEmoji: '🔵',
        themeColor: '#1155cc', // Deep royal blue
        oreType: 'lapis',
        sparkleColor: '#2050e0',
        borderColor: '#000000',
        textColor: 'text-blue-100',
        particle: '🔵',
        xpBonus: 13,
        gradeColor: 'bg-[#15348a]'
      };
    } else if (maxVal === 6) {
      return {
        name: lang === 'uk' ? 'Редстоунова руда' : 'Redstone Ore',
        emoji: '🔴',
        sparkleEmoji: '✨',
        themeColor: '#ff2222', // Luminous brick red
        oreType: 'redstone',
        sparkleColor: '#e53935',
        borderColor: '#000000',
        textColor: 'text-red-100',
        particle: '🔴',
        xpBonus: 14,
        gradeColor: 'bg-[#b71c1c] shadow-[0_0_12px_rgba(255,34,34,0.4)]'
      };
    } else if (maxVal === 7) {
      return {
        name: lang === 'uk' ? 'Золота руда' : 'Gold Ore',
        emoji: '⭐',
        sparkleEmoji: '🟡',
        themeColor: '#f3c623', // Radiant gold ore
        oreType: 'gold',
        sparkleColor: '#ffff55',
        borderColor: '#000000',
        textColor: 'text-yellow-105',
        particle: '🟡',
        xpBonus: 15,
        gradeColor: 'bg-[#cf9222]'
      };
    } else if (maxVal === 8) {
      return {
        name: lang === 'uk' ? 'Смарагдова руда' : 'Emerald Ore',
        emoji: '💚',
        sparkleEmoji: '✨',
        themeColor: '#00e676', // Bright emerald green
        oreType: 'emerald',
        sparkleColor: '#00c853',
        borderColor: '#000000',
        textColor: 'text-emerald-100',
        particle: '💚',
        xpBonus: 18,
        gradeColor: 'bg-[#007b3a] shadow-[0_0_12px_rgba(0,230,118,0.4)]'
      };
    } else if (maxVal === 9) {
      return {
        name: lang === 'uk' ? 'Алмазна руда' : 'Diamond Ore',
        emoji: '💎',
        sparkleEmoji: '✨',
        themeColor: '#3fc1c9', // Pristine Diamond cyan
        oreType: 'diamond',
        sparkleColor: '#55ffff',
        borderColor: '#000000',
        textColor: 'text-cyan-105',
        particle: '💎',
        xpBonus: 20,
        gradeColor: 'bg-[#55aaaa] shadow-[0_0_16px_rgba(85,255,255,0.5)]'
      };
    } else {
      return {
        name: lang === 'uk' ? 'Кварцова руда' : 'Nether Quartz Ore',
        emoji: '⬜',
        sparkleEmoji: '✨',
        themeColor: '#eceff1', // White/Cream crystalline quartz
        oreType: 'quartz',
        sparkleColor: '#ffffff',
        borderColor: '#000000',
        textColor: 'text-slate-100',
        particle: '⬜',
        xpBonus: 22,
        gradeColor: 'bg-[#b0bec5]'
      };
    }
  }, [lang]);

  // Characterization mappings of tools matching player level progression metrics
  const getActiveTool = useCallback((lvl: number, useOverride: boolean = false) => {
    let toolId = 'wooden';
    if (useOverride && selectedPickaxeId) {
      const selected = PICKAXES.find(p => p.id === selectedPickaxeId);
      if (selected && lvl >= selected.minLevel) {
        toolId = selectedPickaxeId;
      } else {
        // Fallback to highest unlocked
        if (lvl < 5) toolId = 'wooden';
        else if (lvl < 10) toolId = 'stone';
        else if (lvl < 15) toolId = 'copper';
        else if (lvl < 20) toolId = 'iron';
        else if (lvl < 25) toolId = 'diamond';
        else if (lvl < 30) toolId = 'netherite';
        else if (lvl < 35) toolId = 'gold';
        else toolId = 'gold';
      }
    } else {
      if (lvl < 5) toolId = 'wooden';
      else if (lvl < 10) toolId = 'stone';
      else if (lvl < 15) toolId = 'copper';
      else if (lvl < 20) toolId = 'iron';
      else if (lvl < 25) toolId = 'diamond';
      else if (lvl < 30) toolId = 'netherite';
      else if (lvl < 35) toolId = 'gold';
      else toolId = 'gold';
    }

    const p = PICKAXES.find(x => x.id === toolId) || PICKAXES[0];
    return {
      id: p.id,
      name: lang === 'uk' ? p.nameUk : p.nameEn,
      item: p.item,
      border: p.border,
      text: p.text,
      colorH: p.colorH,
      colorD: p.colorD,
      colorL: p.colorL,
      multiplier: p.multiplier
    };
  }, [lang, selectedPickaxeId]);

  // Generate math options based on standard grid parameters
  const generateQuestion = useCallback((customF1?: number, customF2?: number): Question => {
    let f1 = customF1;
    let f2 = customF2;

    if (f1 === undefined || f2 === undefined) {
      // Create copies to keep things pure
      const activeQueue = errorQueue.map(e => ({ f1: e.f1, f2: e.f2, cooldownSteps: e.cooldownSteps ?? 0 }));
      const lastQ = currentQuestion ? { f1: currentQuestion.factor1Num, f2: currentQuestion.factor2Num } : null;

      const choice = engineGenerateQuestion(
        currentLevel,
        selectedPickaxeId,
        lastQ,
        historyCounts,
        activeQueue
      );
      f1 = choice.f1;
      f2 = choice.f2;
    }

    const answer = f1 * f2;

    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    // Highly logical near-miss mistake candidates (common child calculation fallbacks)
    const rawOptions = [
      answer + f1,
      answer - f1,
      answer + f2,
      answer - f2,
      (f1 + 1) * f2,
      (f1 - 1) * f2,
      f1 * (f2 + 1),
      f1 * (f2 - 1),
      (f1 + 1) * (f2 - 1),
      (f1 - 1) * (f2 + 1),
      answer + 10,
      answer - 10,
    ];

    // Filter list to keep options realistic (between 4 and 90, matching factors 2 to 9 limits)
    const validRawOptions = rawOptions.filter(v => v > 0 && v !== answer && v <= 90);

    // Pick 2 unique incorrect multipliers
    const shuffledValids = [...validRawOptions].sort(() => Math.random() - 0.5);
    for (const val of shuffledValids) {
      if (optionsSet.size < 3) {
        optionsSet.add(val);
      }
    }

    // Backup generator if candidates set was too narrow
    while (optionsSet.size < 3) {
      const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
      const backupValue = answer + offset;
      if (backupValue > 0 && backupValue !== answer) {
        optionsSet.add(backupValue);
      }
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return {
      factor1Num: f1,
      factor2Num: f2,
      options,
      answer,
    };
  }, [currentLevel, selectedPickaxeId, historyCounts, currentQuestion, errorQueue]);

  // Central driver triggering state transitions of mathematical problems
  const generateNextQuestion = useCallback(() => {
    setIsNewQuestionEntry(true);
    setFailedOptions([]);
    setSelectedOption(null);
    setAnsweredCorrectly(false);
    setCurrentQuestionHasError(false);

    // Create copies to keep things pure
    const activeQueue = errorQueue.map(e => ({ f1: e.f1, f2: e.f2, cooldownSteps: e.cooldownSteps ?? 0 }));
    const lastQ = currentQuestion ? { f1: currentQuestion.factor1Num, f2: currentQuestion.factor2Num } : null;

    const choice = engineGenerateQuestion(
      currentLevel,
      selectedPickaxeId,
      lastQ,
      historyCounts,
      activeQueue
    );

    setCurrentQuestionFromQueue(choice.fromQueue);
    setCurrentQuestion(generateQuestion(choice.f1, choice.f2));

    // Slide/drop indicator delay clean
    setTimeout(() => {
      setIsNewQuestionEntry(false);
    }, 700);
  }, [currentLevel, selectedPickaxeId, historyCounts, currentQuestion, errorQueue, generateQuestion]);

  // Fire first load and subsequent pickaxe selection change questions
  useEffect(() => {
    generateNextQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPickaxeId]);

  // Particles rendering loop
  const spawnMineParticles = useCallback((origX: number, origY: number, emoji: string) => {
    const list: Particle[] = [];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocityMagnitude = 3.5 + Math.random() * 8.5;
      list.push({
        id: Math.random() * 100000 + i,
        x: origX,
        y: origY,
        vx: Math.cos(angle) * velocityMagnitude,
        vy: Math.sin(angle) * velocityMagnitude - 5.5, // initial jump force
        emoji,
        rotation: Math.random() * 360,
        scale: 0.7 + Math.random() * 0.7,
        opacity: 1,
      });
    }
    setParticles((prev) => [...prev, ...list]);
  }, []);

  // Animation ticks updating active particles coordinate states
  useEffect(() => {
    if (particles.length === 0) return;
    const frameId = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => {
            const nextY = p.y + p.vy;
            const nextX = p.x + p.vx;
            return {
              ...p,
              x: nextX,
              y: nextY,
              vy: p.vy + 0.65, // gravity effect multiplier
              opacity: p.opacity - 0.04,
              rotation: p.rotation + p.vx * 1.5,
            };
          })
          .filter((p) => p.opacity > 0)
      );
    }, 25);

    return () => clearInterval(frameId);
  }, [particles]);

  // Clean-up loop to remove old floating text floaters
  useEffect(() => {
    if (floaters.length === 0) return;
    const floaterTimer = setTimeout(() => {
      setFloaters((prev) => prev.slice(1));
    }, 1300);
    return () => clearTimeout(floaterTimer);
  }, [floaters]);

  // Main interactive event click controller
  const handleInteraction = (optionValue: number, optionIdx: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (answeredCorrectly || !currentQuestion) return;
    if (failedOptions.includes(optionIdx)) return;

    // Grab viewport target coordinates for accurate physics bursts and pickaxe overlays
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2 + window.scrollX;
    const clickY = rect.top + rect.height / 2 + window.scrollY;

    // Trigger pickaxe strike mechanics
    playSoundEffect('mine');
    setPickaxeStrike({ optionIndex: optionIdx, x: clickX, y: clickY });

    if (optionValue === currentQuestion.answer) {
      // MATHEMATICAL SUCCESS!
      playSoundEffect('correct');
      setAnsweredCorrectly(true);
      setBlocksMined((b) => b + 1);

      // Get the active tool's multiplier
      const activeToolForMultiplier = getActiveTool(currentLevel, true);
      const pickaxeMultiplier = activeToolForMultiplier.multiplier;

      // Use pure algebraic logic from game engine
      const activeQueue = errorQueue.map(e => ({ f1: e.f1, f2: e.f2, cooldownSteps: e.cooldownSteps ?? 0 }));
      const nextState = engineHandleAnswer(
        currentQuestion.factor1Num,
        currentQuestion.factor2Num,
        true,
        streak,
        pickaxeMultiplier,
        xp,
        historyCounts,
        activeQueue
      );
      setHistoryCounts(nextState.historyCounts);

      const isFirstAttempt = failedOptions.length === 0;
      
      // Update the smart practicing errorQueue based on the engine result (or filtering if solved correctly on first try)
      if (currentQuestionFromQueue && isFirstAttempt) {
        setErrorQueue(nextState.errorQueue.filter(
          (e) =>
            !(
              (e.f1 === currentQuestion.factor1Num && e.f2 === currentQuestion.factor2Num) ||
              (e.f1 === currentQuestion.factor2Num && e.f2 === currentQuestion.factor1Num)
            )
        ));
      } else {
        setErrorQueue(nextState.errorQueue);
      }

      const oreConfig = getOreConfig(currentQuestion.factor1Num, currentQuestion.factor2Num);

      // Sparkle ore textures burst
      spawnMineParticles(clickX, clickY, oreConfig.particle);

      // XP & Streaks logic
      const totalGain = nextState.totalXpGained;
      const streakBonus = nextState.streakBonus;

      // Create rising overlay text
      const risingMessage = `+${totalGain} XP 💎${streakBonus > 0 ? ` (🔥+${streakBonus})` : ''}`;
      setFloaters((prev) => [...prev, { id: Date.now(), x: clickX, y: clickY - 50, text: risingMessage }]);

      // Update calculations
      const currentLvl = calculateLevelFromXp(xp);
      const nextLvl = calculateLevelFromXp(nextState.nextXp);
      
      if (nextLvl > currentLvl) {
        // Only pop banners if transitioning onto an exact milestones unlock tier below 35
        const pickaxeMilestones = [5, 10, 15, 20, 25, 30];
        
        setTimeout(() => {
          if (nextLvl === 35 && !netherEntered) {
            playSoundEffect('portal');
            setShowNetherPortalModal(true);
          } else if (nextLvl < 35 && pickaxeMilestones.includes(nextLvl)) {
            playSoundEffect('levelUp');
            setShowLevelUpBanner(nextLvl);
          }
        }, 400);
      }
      setXp(nextState.nextXp); // Syncing nextXp directly from pure engine calculations.

      // Maintain user streaks
      const nextStreakValue = nextState.nextStreak;
      setStreak(nextStreakValue);
      setHighStreak((h) => Math.max(h, nextStreakValue));

      // Automatically transition to new multiplication ore blocks
      setTimeout(() => {
        setPickaxeStrike(null);
        generateNextQuestion();
      }, 1500);

    } else {
      // MATHEMATICAL FAILURE (Creeper triggered!)
      playSoundEffect('error');
      setFailedOptions((prev) => [...prev, optionIdx]);
      setStreak(0); // broken streaks must restart

      // Trigger red shake animations
      setShakeBlock(true);
      setTimeout(() => setShakeBlock(false), 500);

      // Save to smart practicing queue using pure algebraic engine
      const activeQueue = errorQueue.map(e => ({ f1: e.f1, f2: e.f2, cooldownSteps: e.cooldownSteps ?? 0 }));
      const activeToolForMultiplier = getActiveTool(currentLevel);
      const pickaxeMultiplier = activeToolForMultiplier.multiplier;
      const nextState = engineHandleAnswer(
        currentQuestion.factor1Num,
        currentQuestion.factor2Num,
        false,
        streak,
        pickaxeMultiplier,
        xp,
        historyCounts,
        activeQueue
      );
      setErrorQueue(nextState.errorQueue);
      setCurrentQuestionHasError(true);

      // Spawn puff explosion cloud structures
      spawnMineParticles(clickX, clickY, '💨');

      // Float error indicators
      setFloaters((prev) => [
        ...prev,
        { id: Date.now(), x: clickX, y: clickY - 50, text: t[lang].hiss },
      ]);

      // Remove current swing hit bounds
      setTimeout(() => {
        setPickaxeStrike(null);
      }, 350);
    }
  };

  // Skip visual block triggers
  const skipCurrentBlock = () => {
    generateNextQuestion();
  };

  // Practice custom card factors from saved queue selection directly
  const practiceWeakItem = (item: ErrorItem) => {
    setCurrentQuestion(generateQuestion(item.f1, item.f2));
    setCurrentQuestionFromQueue(true);
    setFailedOptions([]);
    setSelectedOption(null);
    setAnsweredCorrectly(false);
    setCurrentQuestionHasError(false);
  };

  // Clears progress counters by opening custom confirmation modal
  const resetAllProgress = () => {
    playSoundEffect('click');
    setShowResetConfirmModal(true);
  };

  const executeResetAllProgress = () => {
    setXp(0);
    setStreak(0);
    setHighStreak(0);
    setBlocksMined(0);
    setErrorQueue([]);
    setNetherEntered(false);
    setHistoryCounts({});
    localStorage.clear();
    setShowResetConfirmModal(false);
    generateNextQuestion();
  };

  const currentOre = currentQuestion 
    ? getOreConfig(currentQuestion.factor1Num, currentQuestion.factor2Num)
    : null;

  return (
    <div className={`min-h-screen ${netherEntered ? 'bg-nether-grid text-red-50' : 'bg-pixel-grid bg-[#1e1e1e] text-white'} flex flex-col font-mono selection:bg-green-500 selection:text-black`}>
      <style>{customStyles}</style>

      {/* Main Dynamic Animation Effects Backdrop overlays */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-50">
        {/* Floating rising text scores */}
        {floaters.map((f) => (
          <div
            key={f.id}
            className="absolute font-pixel text-xs sm:text-sm md:text-base font-bold text-green-400 drop-shadow-[0_2.5px_0_rgba(0,0,0,1)] animate-float-up pointer-events-none text-center whitespace-nowrap"
            style={{
              left: `${f.x}px`,
              top: `${f.y}px`,
            }}
          >
            {f.text}
          </div>
        ))}

        {/* Flying voxel pixel explosion elements */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute text-lg select-none leading-none pointer-events-none"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              opacity: p.opacity,
              transform: `scale(${p.scale}) rotate(${p.rotation}deg)`,
              transition: 'transform 0.02s linear, opacity 0.02s linear',
            }}
          >
            {p.emoji}
          </div>
        ))}

        {/* Floating Pickaxe animation strike indicator */}
        {pickaxeStrike && (
          <div
            className="absolute text-5xl pointer-events-none select-none z-50 animate-swing"
            style={{
              left: `${pickaxeStrike.x - 30}px`,
              top: `${pickaxeStrike.y - 30}px`,
            }}
          >
            ⛏️
          </div>
        )}
      </div>

      {/* Level Up Spectacular Fanfare Alert Overlay Modal */}
      {showLevelUpBanner !== null && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 animate-fade-in">
          <div className="relative w-full max-w-md p-8 pixel-stone pixel-border-gold rounded-none text-center flex flex-col items-center">
            
            {/* Rotating sunburst rays */}
            <div className="absolute -z-10 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
            
            <div className="text-6xl mb-6 animate-bounce">🏆</div>
            
            <h2 className="font-pixel text-yellow-400 text-lg md:text-xl uppercase tracking-wider leading-relaxed mb-2">
              {t[lang].levelUnlocked}
            </h2>
            
            <p className="font-pixel text-2xl md:text-3xl text-green-400 mb-6 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              LEVEL {showLevelUpBanner}
            </p>

            <div className="w-full bg-zinc-900 border-4 border-zinc-700 p-4 mb-6 flex flex-col items-center justify-center gap-2">
              <span className="font-pixel text-xs text-stone-400 uppercase tracking-wide block mb-1">{t[lang].unlockedNewGear}</span>
              <div className="flex items-center gap-2 justify-center">
                <PixelPickaxe 
                  colorH={getActiveTool(showLevelUpBanner).colorH}
                  colorD={getActiveTool(showLevelUpBanner).colorD}
                  colorL={getActiveTool(showLevelUpBanner).colorL}
                  size={24}
                  className="animate-bounce"
                />
                <span className={`font-pixel text-xs ${getActiveTool(showLevelUpBanner).text} block font-bold`}>
                  {getActiveTool(showLevelUpBanner).name}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowLevelUpBanner(null)}
              className="font-pixel text-xs bg-green-500 hover:bg-green-400 text-black px-6 py-4 border-b-4 border-green-800 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full max-w-xs cursor-pointer"
            >
              {t[lang].continueMining}
            </button>
          </div>
        </div>
      )}

      {/* Nether Portal Spectacular Transition Modal */}
      {showNetherPortalModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 animate-fade-in">
          <div className="relative w-full max-w-md p-8 border-8 border-purple-900 bg-[#160616] text-center flex flex-col items-center shadow-[0_0_50px_rgba(168,85,247,0.5)]">
            
            {/* Swirling energy back-glow */}
            <div className="absolute -z-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
            
            <div className="text-6xl mb-6 select-none animate-pulse">🌌</div>
            
            <h2 className="font-pixel text-purple-400 text-lg md:text-xl uppercase tracking-wider leading-relaxed mb-4 text-shadow-stat">
              {t[lang].netherPortalTitle}
            </h2>
            
            <p className="font-pixel text-[9px] sm:text-xs text-stone-300 mb-6 leading-relaxed">
              {t[lang].netherPortalDesc}
            </p>

            {/* Glowing Purple Swirl Portal Frame */}
            <div className="w-48 h-64 border-8 border-zinc-900 bg-black relative overflow-hidden mb-6 flex flex-col items-center justify-center shadow-[inset_0_0_30px_rgba(168,85,247,0.8),_0_0_20px_rgba(168,85,247,0.4)]">
              {/* Swirling Portal energy lines */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(168,85,247,0.35)_100%)] animate-pulse" />
              <div className="absolute inset-2 border-4 border-dashed border-purple-500/50 rounded-full animate-spin [animation-duration:12s]" />
              <div className="absolute inset-6 border-4 border-dashed border-purple-400/30 rounded-full animate-spin [animation-duration:6s] [animation-direction:reverse]" />
              <div className="absolute w-full h-full bg-[linear-gradient(rgba(147,51,234,0.15)_3px,_transparent_3px)] bg-[size:100%_8px] pointer-events-none" />
              <span className="font-pixel text-4xl animate-pulse z-10 font-bold">🔮</span>
            </div>

            <button
              onClick={() => {
                setNetherEntered(true);
                setShowNetherPortalModal(false);
                playSoundEffect('portal');
                generateNextQuestion();
              }}
              className="font-pixel text-xs bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 border-b-4 border-purple-950 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full max-w-xs cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]"
            >
              {t[lang].enterNetherBtn}
            </button>
          </div>
        </div>
      )}

      {/* Primary Application Header (Scoreboard styled in Vibrant Palette theme) */}
      <header className={`${netherEntered ? 'bg-[#3c1414] border-red-950 shadow-[0_4px_16px_rgba(239,68,68,0.25)]' : 'bg-[#313131] border-black'} border-b-4 sm:border-b-8 p-2 sm:p-4 md:px-10 sticky top-0 z-30 select-none`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand logo & sound toggle */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-3xl select-none animate-pulse">{netherEntered ? '👿' : '⛏️'}</span>
              <div>
                <h1 className={`font-pixel text-[11px] sm:text-base md:text-lg ${netherEntered ? 'text-red-500' : 'text-yellow-500'} uppercase tracking-wider text-shadow-stat`}>
                  CRAFT MATH
                </h1>
                <span className={`font-pixel text-[6px] sm:text-[9px] ${netherEntered ? 'text-purple-400 font-bold animate-pulse' : 'text-[#55ffff]'} text-shadow-streak block uppercase`}>
                  {netherEntered ? t[lang].netherWorldActive : 'Multiplication Miner'}
                </span>
              </div>
            </div>

            {/* Sound toggle controls */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                // Simple click sound toggle feedback handler when switching options
                if (!soundEnabled) {
                  setTimeout(() => playSoundEffect('correct'), 100);
                }
              }}
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
              className="p-1 px-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-neutral-700 border-2 sm:border-4 border-black text-white flex items-center justify-center cursor-pointer ml-2 transition-all duration-75 active:scale-95"
            >
              {soundEnabled ? <Volume2 size={14} className="text-[#55ff55] sm:w-[18px]" /> : <VolumeX size={14} className="text-stone-400 sm:w-[18px]" />}
            </button>
          </div>

          {/* Player stats widget dashboards in Vibrant Palette pixel boxes */}
          <div className="flex items-center gap-1.5 sm:gap-3 justify-center w-full sm:w-auto">
            
            {/* Active Level Panel */}
            <div className="pixel-border bg-[#1e1e1e] p-1 px-2 text-center rounded-none flex items-center justify-center gap-1.5 sm:gap-3 h-10 sm:h-12 min-w-[70px] xs:min-w-[85px] sm:min-w-[120px] box-border">
              <div className="text-sm sm:text-xl shrink-0 flex items-center">🛡️</div>
              <div className="text-left flex flex-col justify-center">
                <span className="font-pixel text-[6px] sm:text-[8px] text-[#8b8b8b] uppercase block leading-none mb-0.5">{t[lang].gearLevel}</span>
                <span className="font-pixel text-[8px] xs:text-[10px] sm:text-[12px] uppercase font-bold text-[#55ff55] text-shadow-streak block leading-none">
                  LVL {currentLevel}
                </span>
              </div>
            </div>

            {/* Streak module indicators */}
            <div className="pixel-border bg-[#1e1e1e] p-1 px-2 text-center rounded-none flex items-center justify-center gap-1.5 sm:gap-3 h-10 sm:h-12 min-w-[70px] xs:min-w-[85px] sm:min-w-[120px] box-border">
              <div className="text-[#ff5555] shrink-0 flex items-center">
                {streak >= 50 ? <CreeperStreakIcon size={1.5} className="animate-pulse" /> : <Flame size={14} className="animate-pulse sm:w-[18px]" />}
              </div>
              <div className="text-left flex flex-col justify-center">
                <span className="font-pixel text-[6px] sm:text-[8px] text-[#8b8b8b] uppercase block leading-none mb-0.5">{t[lang].streak}</span>
                {streak >= 50 ? (
                  <span className="font-pixel text-[8px] xs:text-[10px] sm:text-[12px] text-[#4cd645] font-bold block text-shadow-streak leading-none">
                    {streak}
                  </span>
                ) : (
                  <span className="font-pixel text-[8px] xs:text-[10px] sm:text-[12px] text-[#ff5555] font-bold block text-shadow-streak leading-none">
                    {streak}
                  </span>
                )}
              </div>
            </div>

            {/* Trophy / High Streak block */}
            <div className="pixel-border bg-[#1e1e1e] p-1 px-2 text-center rounded-none flex items-center justify-center gap-1.5 sm:gap-3 h-10 sm:h-12 min-w-[70px] xs:min-w-[85px] sm:min-w-[120px] box-border">
              <div className="text-yellow-400 shrink-0 flex items-center"><Trophy size={14} className="text-yellow-400 animate-bounce sm:w-[18px]" /></div>
              <div className="text-left flex flex-col justify-center">
                <span className="font-pixel text-[6px] sm:text-[8px] text-[#8b8b8b] uppercase block leading-none mb-0.5">{t[lang].maxRecord}</span>
                <span className="font-pixel text-[8px] xs:text-[10px] sm:text-[12px] text-yellow-400 font-bold block text-shadow-streak leading-none">
                  {highStreak}
                </span>
              </div>
            </div>
            
          </div>
        </div>

        {/* Live Minecraft Style Action Green Progress XP Bar */}
        <div className="w-full mt-2 h-4 sm:h-6 bg-black border-2 sm:border-4 border-[#373737] relative select-none">
          {/* Progress fill calculating next level limits dynamically */}
          <div 
            className="h-full bg-[#55ff55] transition-all duration-300 ease-out" 
            style={{ width: `${progressPercent}%`, boxShadow: '0 0 10px #55ff55, inset 0 1px 0 rgba(255,255,255,0.3)' }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-pixel text-[6px] sm:text-[9px] text-white font-bold pointer-events-none text-shadow-streak uppercase">
            XP: {xp} / {nextLevelThresholdXp} {t[lang].toNextLevel}
          </div>
        </div>
      </header>

      {/* Secondary Subtitle banner showcasing current tool */}
      <section className="bg-zinc-950 border-b-2 sm:border-b-4 border-zinc-900 py-1 sm:py-2 px-2 text-center select-none">
        <span className="font-pixel text-[7px] sm:text-xs text-stone-400 uppercase tracking-wider block max-w-7xl mx-auto">
          {t[lang].currentlyMiningWith}{' '}
          <strong 
            onClick={() => {
              playSoundEffect('click');
              setShowPickaxeSelector(true);
            }}
            className={`font-black ${getActiveTool(currentLevel, true).text} underline decoration-dashed cursor-pointer hover:brightness-125 hover:scale-105 inline-flex items-center gap-1.5 transition-transform duration-75 active:scale-95 px-2 py-1 rounded bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700`}
            title={lang === 'uk' ? 'Натисніть, щоб змінити кайло!' : 'Click to change pickaxe!'}
          >
            <PixelPickaxe 
              colorH={getActiveTool(currentLevel, true).colorH}
              colorD={getActiveTool(currentLevel, true).colorD}
              colorL={getActiveTool(currentLevel, true).colorL}
              size={12}
            />
            <span>{getActiveTool(currentLevel, true).name}</span>
          </strong>
        </span>
      </section>

      {/* Content Area */}
      <main className="flex-grow max-w-xl w-full mx-auto p-2 sm:p-4 md:py-6 flex flex-col justify-center gap-2 sm:gap-4">
        
        {/* Center Sandbox Mine Site Grid */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 relative min-h-[220px] xs:min-h-[280px] sm:min-h-[350px]">
            {currentQuestion ? (
              <div className="w-full max-w-xl flex flex-col items-center relative">
                
                {/* Micro notification block */}
                {currentQuestionFromQueue && (
                  <div className="absolute -top-12 z-20 px-3 py-1.5 bg-yellow-500 text-black font-pixel text-[8px] uppercase tracking-wide border-2 border-black animate-pulse">
                    ⚠️ {t[lang].practicingWeakSpot}!
                  </div>
                )}

                 {/* The main epic Ore block container */}
                 <div
                   className={`relative w-52 h-52 xs:w-64 xs:h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 cursor-pointer select-none flex flex-col items-center justify-center transition-all duration-150
                     ${isNewQuestionEntry ? 'animate-drop' : ''} 
                     ${shakeBlock ? 'animate-shake' : ''} 
                     ${answeredCorrectly ? 'animate-crack' : ''}
                   `}
                   onClick={(e) => {
                     // Clicking the block lets you see particles / makes satisfying click sound!
                     if (answeredCorrectly) return;
                     playSoundEffect('mine');
                     spawnMineParticles(e.clientX, e.clientY, currentOre ? currentOre.particle : '⚡');
                   }}
                   title={t[lang].crackMineralTitle}
                 >
                   
                   {/* Isometric 3D Canvas Ore Block */}
                   <OreBlock 
                     oreColor={currentOre ? currentOre.themeColor : '#3fc1c9'}
                     isNether={netherEntered}
                     oreType={currentOre ? currentOre.oreType : "diamond"}
                      answeredCorrectly={answeredCorrectly}
                   />




                   {/* Mathematical Factor text (repositioned higher and enlarged as requested) */}
                   {currentOre && (
                     <span className="absolute -top-8 xs:-top-11 sm:-top-14 md:-top-16 font-pixel text-[8px] xs:text-[10px] sm:text-xs md:text-sm text-stone-100 tracking-wide uppercase text-shadow-streak select-none z-10 font-bold text-center px-1">
                       {currentOre.name}
                     </span>
                   )}

                   <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center select-none pointer-events-none">
                     <p className="font-pixel text-xl xs:text-2xl sm:text-4xl md:text-5xl text-white font-black tracking-normal text-shadow-problem">
                       {currentQuestion.factor1Num} × {currentQuestion.factor2Num}
                     </p>
                   </div>
                 </div>

                {/* Answer chest selectors array */}
                <div className="w-full mt-8 xs:mt-12 sm:mt-16 md:mt-24">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                    {currentQuestion.options.map((option, idx) => {
                      const isFailed = failedOptions.includes(idx);
                      const isSuccess = answeredCorrectly && option === currentQuestion.answer;
                      
                      return (
                        <button
                          key={idx}
                          id={`option-btn-${idx}`}
                          onClick={(e) => handleInteraction(option, idx, e)}
                          disabled={answeredCorrectly || isFailed}
                          className={`relative py-2 sm:py-4 md:py-6 rounded-none cursor-pointer min-h-[55px] xs:min-h-[65px] sm:min-h-[85px] md:min-h-[100px] select-none flex flex-col items-center justify-center font-pixel outline-none transition-all duration-100 pixel-border text-shadow-stat
                            ${isFailed 
                              ? 'bg-red-950/50 text-stone-500 border-red-900 scale-95 opacity-50 cursor-not-allowed line-through' 
                              : isSuccess
                              ? 'bg-[#557a55] text-white scale-105'
                              : 'bg-[#8b4513] hover:bg-[#a0522d] text-white active:scale-95'
                            }
                          `}
                        >
                          <div className="flex items-center justify-center">
                            {/* Option value text */}
                            <span className="text-base xs:text-lg sm:text-2xl md:text-4xl font-black tracking-tight text-white">
                              {option}
                            </span>
                          </div>

                          {/* Chest lock icon design style */}
                          {!isFailed && !isSuccess && (
                            <div className="w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 bg-yellow-600 border border-black mt-1.5 rounded-sm relative flex items-center justify-center shrink-0">
                              <div className="w-1 h-1 xs:w-1.5 xs:h-1.5 bg-black rounded-full" />
                            </div>
                          )}
                          {isSuccess && (
                            <span className="text-[7px] xs:text-[8px] sm:text-[10px] text-green-300 font-bold block uppercase mt-1 sm:mt-2">{t[lang].claimed}</span>
                          )}
                          {isFailed && (
                            <span className="text-[7px] xs:text-[8px] sm:text-[10px] text-red-400 font-bold block uppercase mt-1 sm:mt-2">{t[lang].tntBoom}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Safe failover / skip current block */}
                <div className="mt-6 xs:mt-10 sm:mt-14 flex justify-center gap-4">
                  <button
                    onClick={skipCurrentBlock}
                    className="font-pixel text-[7px] xs:text-[9px] text-stone-400 hover:text-stone-200 transition-colors bg-zinc-900 hover:bg-zinc-850 px-3 py-1.5 xs:px-4 xs:py-2 border-2 border-zinc-950 uppercase cursor-pointer"
                  >
                    {t[lang].skipBlock}
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-12">
                <p className="font-pixel text-sm text-stone-400 uppercase mb-4">{t[lang].generatingWorld}</p>
                <div className="w-16 h-16 border-t-4 border-yellow-500 border-solid rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>

      </main>

      {/* Footer bar with inventory slots and professional XP fill */}
      <footer className="footer-bar py-2 px-3 sm:py-3 sm:px-6 mt-4 z-20 select-none">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-1 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Hotbar slots */}
            <button 
              onClick={() => {
                playSoundEffect('click');
                setShowStatsModal(true);
              }}
              className="inventory-slot flex items-center justify-center text-base sm:text-xl cursor-pointer hover:bg-neutral-700 active:scale-95 transition-all outline-none"
              title={t[lang].statistics}
            >
              💎
            </button>
            <button 
              onClick={() => {
                playSoundEffect('click');
                setShowHelpModal(true);
              }}
              className="inventory-slot flex items-center justify-center text-base sm:text-xl cursor-pointer hover:bg-neutral-700 active:scale-95 transition-all outline-none"
              title={t[lang].howToPlayTitle}
            >
              ❓
            </button>
            <button 
              onClick={() => {
                playSoundEffect('click');
                setShowMissionsModal(true);
              }}
              className="inventory-slot flex items-center justify-center text-base sm:text-xl cursor-pointer hover:bg-neutral-700 active:scale-95 transition-all outline-none"
              title={t[lang].miningMissions}
            >
              🍎
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-pixel text-[7px] xs:text-[9px] text-[#55ff55] text-shadow-streak mr-1 sm:mr-3 uppercase">
              {t[lang].totalMined.split(':')[0]}: {blocksMined}
            </span>
            {/* Option slots for system config click actions */}
            <button 
              onClick={resetAllProgress}
              className="inventory-slot flex items-center justify-center text-sm sm:text-lg cursor-pointer hover:bg-neutral-700 transition outline-none" 
              title={t[lang].resetWorldTitle}
            >
              🔄
            </button>
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowSettingsModal(true);
              }}
              className="inventory-slot flex items-center justify-center text-sm sm:text-lg cursor-pointer hover:bg-neutral-700 transition outline-none" 
              title={t[lang].systemGearTitle}
            >
              ⚙️
            </button>
          </div>
        </div>
      </footer>

      {/* Minecraft/Roblox Custom Settings Modal Pop-Up Window */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm p-6 pixel-stone pixel-border border-b-8 border-r-8 text-center flex flex-col items-center animate-drop">
            
            <div className="text-4xl mb-2 animate-pulse">⚙️</div>
            
            <h2 className="font-pixel text-yellow-400 text-base md:text-lg uppercase tracking-wider mb-6 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              {t[lang].settingsTitle}
            </h2>

            {/* Language Selector Block Section */}
            <div className="w-full text-left mb-6">
              <span className="font-pixel text-[9px] md:text-[10px] text-stone-400 uppercase tracking-wider block mb-2 font-bold">
                {t[lang].languageTitle}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLang('en');
                    playSoundEffect('click');
                  }}
                  className={`font-pixel text-2xs py-2 px-3 border-4 select-none cursor-pointer text-center transition-all duration-75 uppercase font-black
                    ${lang === 'en'
                      ? 'bg-[#555] text-yellow-300 border-[#55ff55]'
                      : 'bg-[#2a2a2a] text-stone-300 hover:text-white border-black hover:bg-neutral-800'
                    }
                  `}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLang('uk');
                    playSoundEffect('click');
                  }}
                  className={`font-pixel text-2xs py-2 px-3 border-4 select-none cursor-pointer text-center transition-all duration-75 uppercase font-black
                    ${lang === 'uk'
                      ? 'bg-[#555] text-yellow-300 border-[#55ff55]'
                      : 'bg-[#2a2a2a] text-stone-300 hover:text-white border-black hover:bg-neutral-800'
                    }
                  `}
                >
                  UK
                </button>
              </div>
            </div>

            {/* Custom Range Volume Slider Section */}
            <div className="w-full text-left mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[9px] md:text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                  {t[lang].soundVolume}
                </span>
                <span className="font-pixel text-[10px] text-green-400 font-bold">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl select-none text-stone-400">
                  {volume === 0 ? '🔇' : '🔊'}
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(volume * 100)}
                  onChange={(e) => {
                    const newVol = parseInt(e.target.value) / 100;
                    setVolume(newVol);
                  }}
                  className="w-full cursor-pointer range-pixel"
                />
              </div>
            </div>

            {/* Done Action Close Trigger Option */}
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowSettingsModal(false);
              }}
              className="font-pixel text-2xs bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 border-b-4 border-green-800 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full cursor-pointer"
            >
              {t[lang].doneBtn}
            </button>
          </div>
        </div>
      )}

      {/* Mining Missions Pop-up Modal */}
      {showMissionsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-md p-6 pixel-stone pixel-border border-b-8 border-r-8 text-center flex flex-col animate-drop max-h-[90vh]">
            
            <div className="text-4xl mb-2">📖</div>
            
            <h2 className="font-pixel text-yellow-500 text-base md:text-lg uppercase tracking-wider mb-3 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              {t[lang].miningMissions}
            </h2>

            <p className="font-pixel text-[9px] md:text-[10px] leading-relaxed text-stone-300 uppercase mb-4">
              {t[lang].missionsDesc}
            </p>

            {/* Scrollable list of mistakes/quests */}
            <div className="flex-1 overflow-y-auto custom-scroll pr-1 max-h-[250px] mb-6 text-left">
              {errorQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-4 border-zinc-900 bg-zinc-950/40">
                  <span className="text-3xl mb-3">🛡️</span>
                  <p className="font-pixel text-[10px] text-green-400 uppercase block mb-1">
                    {t[lang].safeZone}
                  </p>
                  <p className="font-pixel text-[8px] sm:text-[9px] text-stone-500 uppercase leading-relaxed text-center">
                    {t[lang].allBlocksCleared}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[9px] md:text-[10px] text-red-500 uppercase block font-bold">
                      ⚠️ {t[lang].weakSpots}: {errorQueue.length}
                    </span>
                  </div>
                  {errorQueue.map((item, index) => (
                    <div 
                      key={index}
                      className="border-4 border-stone-800 bg-stone-900/50 p-3 text-stone-200 flex items-center justify-between"
                    >
                      <span className="font-pixel text-xs py-1 text-yellow-500 font-bold">
                        {item.f1} × {item.f2}
                      </span>
                      <button
                        onClick={() => {
                          playSoundEffect('click');
                          practiceWeakItem(item);
                          setShowMissionsModal(false);
                        }}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black border-b-4 border-yellow-800 font-pixel text-[9px] uppercase font-black transition-all cursor-pointer hover:translate-y-0.5 active:translate-y-1 active:scale-95"
                      >
                        {t[lang].mine}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowMissionsModal(false);
              }}
              className="font-pixel text-2xs bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 border-b-4 border-green-800 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full cursor-pointer"
            >
              {t[lang].doneBtn}
            </button>
          </div>
        </div>
      )}

      {/* Statistics Pop-up Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm p-6 pixel-stone pixel-border border-b-8 border-r-8 text-center flex flex-col animate-drop">
            
            <div className="text-4xl mb-2">📊</div>
            
            <h2 className="font-pixel text-yellow-500 text-base md:text-lg uppercase tracking-wider mb-6 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              {t[lang].statistics}
            </h2>

            {/* Quick stats board */}
            <div className="w-full bg-zinc-950/60 border-4 border-zinc-900 p-4 text-stone-200 mb-6 space-y-3 text-left">
              <div className="flex justify-between py-1 border-b-2 border-stone-800">
                <span className="font-pixel text-[10px] text-stone-400 uppercase">{t[lang].blocksMined}</span>
                <span className="font-pixel text-xs text-yellow-500 font-bold">{blocksMined}</span>
              </div>
              <div className="flex justify-between py-1 border-b-2 border-stone-800">
                <span className="font-pixel text-[10px] text-stone-400 uppercase">{t[lang].currentXp}</span>
                <span className="font-pixel text-xs text-green-400 font-bold">{xp} XP</span>
              </div>
              <div className="flex justify-between py-1 border-b-2 border-stone-800">
                <span className="font-pixel text-[10px] text-stone-400 uppercase">{t[lang].bestStreak}</span>
                <span className="font-pixel text-xs text-orange-400 font-bold">🔥 {highStreak}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-pixel text-[10px] text-stone-400 uppercase">{t[lang].gearLevel}:</span>
                <span className="font-pixel text-xs text-cyan-300 font-bold">LVL {currentLevel}</span>
              </div>
            </div>

            {/* Reset Progress stats button from inside stats pop-up */}
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowStatsModal(false);
                resetAllProgress();
              }}
              className="mb-6 w-full py-2.5 bg-stone-900 hover:bg-red-950 text-red-100 hover:text-red-300 border-4 border-stone-950 font-pixel text-[9px] uppercase cursor-pointer block text-center transition-colors duration-150"
            >
              {t[lang].resetWorld}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowStatsModal(false);
              }}
              className="font-pixel text-2xs bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 border-b-4 border-green-800 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full cursor-pointer"
            >
              {t[lang].doneBtn}
            </button>
          </div>
        </div>
      )}

      {/* Help instruction dialog Pop-up Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm p-6 pixel-stone pixel-border border-b-8 border-r-8 text-center flex flex-col items-center animate-drop">
            
            <div className="text-4xl mb-2">❓</div>
            
            <h2 className="font-pixel text-yellow-500 text-base md:text-lg uppercase tracking-wider mb-4 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              {t[lang].howToPlayTitle}
            </h2>

            <div className="bg-zinc-950/60 border-4 border-zinc-900 p-4 text-stone-200 mb-6 text-left">
              <p className="font-pixel text-[9px] sm:text-[10px] leading-relaxed text-stone-200 select-text uppercase">
                {t[lang].howToPlay}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowHelpModal(false);
              }}
              className="font-pixel text-2xs bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 border-b-4 border-green-800 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full cursor-pointer select-none"
            >
              {t[lang].doneBtn}
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Pop-up Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm p-6 bg-[#2d0c0c] border-8 border-red-900 text-center flex flex-col items-center shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-drop">
            
            <div className="text-4xl mb-4 select-none animate-pulse">⚠️</div>
            
            <h2 className="font-pixel text-red-500 text-sm sm:text-base uppercase tracking-wider mb-4 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              {lang === 'uk' ? 'Скидання Поступу' : 'Danger Zone'}
            </h2>
            
            <div className="bg-black/40 border-4 border-red-950 p-3 mb-6 text-left">
              <p className="font-pixel text-[9px] sm:text-[10px] leading-relaxed text-stone-200 uppercase">
                {t[lang].resetConfirm}
              </p>
            </div>
            
            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  playSoundEffect('click');
                  executeResetAllProgress();
                }}
                className="font-pixel text-2xs bg-red-600 hover:bg-red-500 text-white px-4 py-3 border-b-4 border-red-950 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full cursor-pointer text-center"
              >
                {t[lang].resetConfirmButton}
              </button>

              <button
                onClick={() => {
                  playSoundEffect('click');
                  setShowResetConfirmModal(false);
                }}
                className="font-pixel text-2xs bg-stone-700 hover:bg-stone-600 text-stone-200 px-4 py-3 border-b-4 border-stone-900 uppercase font-black transition-all duration-100 hover:translate-y-0.5 active:translate-y-1 block w-full cursor-pointer text-center"
              >
                {t[lang].cancelConfirmButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickaxe Selection Modal Pop-Up Window */}
      {showPickaxeSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-sm p-6 pixel-stone pixel-border border-b-8 border-r-8 text-center flex flex-col animate-drop">
            
            <div className="text-4xl mb-2 select-none animate-bounce">⛏️</div>
            
            <h2 className="font-pixel text-yellow-400 text-xs sm:text-sm uppercase tracking-wider mb-4 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              {t[lang].choosePickaxe}
            </h2>

            {/* Pickaxes scrollable container */}
            <div className="w-full max-h-[280px] overflow-y-auto space-y-2 pr-1 text-left mb-5 bg-zinc-950/40 p-2 border-2 border-stone-800">
              
              {/* Option 0: Auto Select */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPickaxeId(null);
                  playSoundEffect('click');
                }}
                className={`w-full text-left p-2 border-4 transition-all duration-75 block cursor-pointer select-none
                  ${selectedPickaxeId === null 
                    ? 'bg-[#424242] text-yellow-350 border-[#55ff55]' 
                    : 'bg-[#212121] text-stone-300 hover:text-white border-black hover:bg-neutral-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[8px] sm:text-[9px] uppercase flex items-center gap-2">
                    🔄 {t[lang].autoSelect}
                  </span>
                  {selectedPickaxeId === null && (
                    <span className="font-pixel text-[8px] text-green-400 uppercase">
                      ✔️
                    </span>
                  )}
                </div>
              </button>

              {/* List of Pickaxes */}
              {PICKAXES.map((pickaxe) => {
                const isUnlocked = currentLevel >= pickaxe.minLevel;
                const isSelected = selectedPickaxeId === pickaxe.id;
                
                // Determine if this tool is active under auto setting
                const isAutoActive = selectedPickaxeId === null && (
                  (pickaxe.id === 'wooden' && currentLevel < 5) ||
                  (pickaxe.id === 'stone' && currentLevel >= 5 && currentLevel < 10) ||
                  (pickaxe.id === 'copper' && currentLevel >= 10 && currentLevel < 15) ||
                  (pickaxe.id === 'iron' && currentLevel >= 15 && currentLevel < 20) ||
                  (pickaxe.id === 'diamond' && currentLevel >= 20 && currentLevel < 25) ||
                  (pickaxe.id === 'netherite' && currentLevel >= 25 && currentLevel < 30) ||
                  (pickaxe.id === 'gold' && currentLevel >= 30)
                );
                
                const isEquippedActive = isSelected || isAutoActive;

                return (
                  <button
                    key={pickaxe.id}
                    disabled={!isUnlocked}
                    type="button"
                    onClick={() => {
                      if (isUnlocked) {
                        setSelectedPickaxeId(pickaxe.id);
                        playSoundEffect('click');
                      }
                    }}
                    className={`w-full text-left p-2 border-4 transition-all duration-75 block select-none
                      ${!isUnlocked 
                        ? 'bg-zinc-950/60 border-zinc-900 opacity-50 cursor-not-allowed text-stone-600' 
                        : isEquippedActive
                          ? 'bg-[#37474f] text-yellow-300 border-[#55ff55] cursor-pointer'
                          : 'bg-[#212121] text-stone-300 hover:text-white border-black hover:bg-neutral-800 cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PixelPickaxe 
                          colorH={pickaxe.colorH}
                          colorD={pickaxe.colorD}
                          colorL={pickaxe.colorL}
                          size={20}
                          className={!isUnlocked ? "opacity-30 grayscale" : ""}
                        />
                        <span className={`font-pixel text-[8px] sm:text-[9px] font-black ${isUnlocked ? 'text-[#55ff55]' : 'text-stone-600'} w-7 shrink-0 text-center`}>
                          x{pickaxe.multiplier}
                        </span>
                        <div className="flex flex-col">
                          <span className={`font-pixel text-[8px] sm:text-[9px] uppercase ${isUnlocked ? pickaxe.text : 'text-stone-500'}`}>
                            {lang === 'uk' ? pickaxe.nameUk : pickaxe.nameEn}
                          </span>
                          {!isUnlocked && (
                            <span className="font-pixel text-[6px] text-red-400 uppercase mt-0.5">
                              {t[lang].pickaxeUnlockedAt} {pickaxe.minLevel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        {isEquippedActive ? (
                          <span className="font-pixel text-[7px] sm:text-[8px] text-[#55ff55] uppercase animate-pulse">
                            {lang === 'uk' ? 'Екіп' : 'Equip'} ✔️
                          </span>
                        ) : isUnlocked ? (
                          <span className="font-pixel text-[7px] sm:text-[8px] text-stone-500 uppercase">
                            {lang === 'uk' ? 'Вдягти' : 'Equip'}
                          </span>
                        ) : (
                          <span className="font-pixel text-[6px] sm:text-[7px] text-red-500 uppercase">
                            🔒 {t[lang].pickaxeLocked.replace(' 🔒', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Done Close Button */}
            <button
              onClick={() => {
                playSoundEffect('click');
                setShowPickaxeSelector(false);
              }}
              className="font-pixel text-xs bg-[#555] hover:bg-neutral-600 text-white py-3 px-6 border-b-4 border-black uppercase font-black cursor-pointer w-full transition-all duration-75 active:scale-95"
            >
              {lang === 'uk' ? 'Готово' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
