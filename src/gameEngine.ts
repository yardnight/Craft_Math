/**
 * Math Miner - Core Mathematical & Game Engine Logic
 * 
 * This file implements the core mathematical models, game rules, and progression systems 
 * of the Math Miner educational game. Designed with strict functional programming 
 * principles, all functions are pure, non-mutating, thoroughly commented, and easily 
 * testable.
 */

/**
 * Represents a single multiplication error item stored in the practice queue.
 */
export interface ErrorItem {
  f1: number;
  f2: number;
  cooldownSteps: number;
}

/**
 * Definition of pickaxes and their associated mathematical level targets.
 */
export interface PickaxeDef {
  id: string;
  minLevel: number;
  f1: number[];
  f2: number[];
}

/**
 * Master catalog mapping the game's level progression to mathematical factors.
 */
export const PICKAXE_DEFS: PickaxeDef[] = [
  { id: 'wooden', minLevel: 1, f1: [2, 3], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'stone', minLevel: 5, f1: [3, 4], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'copper', minLevel: 10, f1: [4, 5], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'iron', minLevel: 15, f1: [5, 6], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'diamond', minLevel: 20, f1: [6, 7], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'netherite', minLevel: 25, f1: [7, 8], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'gold', minLevel: 30, f1: [8, 9], f2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
];

/**
 * Calculates the XP bounds for a given level under the dynamic, non-linear progression structure.
 */
export const getLevelXpBounds = (lvl: number): { req: number; prevTotal: number } => {
  if (lvl < 5) return { req: 40, prevTotal: (lvl - 1) * 40 };
  if (lvl < 10) return { req: 64, prevTotal: 4 * 40 + (lvl - 5) * 64 };
  if (lvl < 15) return { req: 80, prevTotal: 4 * 40 + 5 * 64 + (lvl - 10) * 80 };
  if (lvl < 20) return { req: 96, prevTotal: 4 * 40 + 5 * 64 + 5 * 80 + (lvl - 15) * 96 };
  if (lvl < 25) return { req: 112, prevTotal: 4 * 40 + 5 * 64 + 5 * 80 + 5 * 96 + (lvl - 20) * 112 };
  if (lvl < 30) return { req: 128, prevTotal: 4 * 40 + 5 * 64 + 5 * 80 + 5 * 96 + 5 * 112 + (lvl - 25) * 128 };
  if (lvl < 35) return { req: 192, prevTotal: 4 * 40 + 5 * 64 + 5 * 80 + 5 * 96 + 5 * 112 + 5 * 128 + (lvl - 30) * 192 };
  return { req: 200, prevTotal: 4 * 40 + 5 * 64 + 5 * 80 + 5 * 96 + 5 * 112 + 5 * 128 + 5 * 192 + (lvl - 35) * 200 };
};

/**
 * Calculates the exact dynamic level of a player matching active cumulative XP.
 */
export const calculateLevelFromXp = (xp: number): number => {
  let lvl = 1;
  while (true) {
    const { req, prevTotal } = getLevelXpBounds(lvl);
    if (xp < prevTotal + req) {
      return lvl;
    }
    lvl++;
  }
};


/**
 * Utility to get solved frequency counts from history records under either string format
 * (e.g. "2x3" or "2_3") including commutative/mirror properties.
 */
export const getSolveCount = (f1: number, f2: number, counts: Record<string, number>): number => {
  return (
    counts[`${f1}x${f2}`] ??
    counts[`${f1}_${f2}`] ??
    counts[`${f2}x${f1}`] ??
    counts[`${f2}_${f1}`] ??
    0
  );
};

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Function 1: getEffectivePools(currentLevel, chosenPickaxe)
 * 
 * Determines the range of numbers for the first factor (f1) and second factor (f2)
 * based on player level and selected equipment pickaxe. 
 * Allows players to downgrade equipment to practice simpler tables if desired.
 * 
 * @param currentLevel The player's actual calculated level
 * @param chosenPickaxe The ID of the currently selected pickaxe (optional)
 * @returns An object containing the f1 and f2 candidate Pools
 */
export function getEffectivePools(
  currentLevel: number,
  chosenPickaxe?: string | null
): { f1: number[]; f2: number[] } {
  // Level 35+ enters Nether World (Endgame static hardcore difficulty)
  if (currentLevel >= 35) {
    return {
      f1: [2, 3, 4, 5, 6, 7, 8, 9],
      f2: [2, 3, 4, 5, 6, 7, 8, 9, 10] // 1 is removed for extreme difficulty
    };
  }

  let activeId = 'wooden';

  if (chosenPickaxe) {
    const p = PICKAXE_DEFS.find(x => x.id === chosenPickaxe);
    // Only allow using the pickaxe if players have unlocked it by reaching its minLevel
    if (p && currentLevel >= p.minLevel) {
      activeId = chosenPickaxe;
    } else {
      // Fallback: highest unlocked pickaxe for current player level
      const unlocked = PICKAXE_DEFS.filter(x => currentLevel >= x.minLevel);
      if (unlocked.length > 0) {
        activeId = unlocked[unlocked.length - 1].id;
      }
    }
  } else {
    // Default highest unlocked pickaxe for current player level
    const unlocked = PICKAXE_DEFS.filter(x => currentLevel >= x.minLevel);
    if (unlocked.length > 0) {
      activeId = unlocked[unlocked.length - 1].id;
    }
  }

  const activeDef = PICKAXE_DEFS.find(x => x.id === activeId) || PICKAXE_DEFS[0];
  return {
    f1: activeDef.f1,
    f2: activeDef.f2
  };
}

/**
 * Function 2: checkPoolTransition(currentLevel, previousLevel, currentHistory, currentQueue)
 * * Monitors level changes to detect when a player transitions into a completely new 
 * tool tier (a change in the f1 factor pool) or enters the Nether World (Level 35+).
 * When a tier shift occurs, it completely resets the local history metrics and 
 * error queues to eliminate "commutative mirror tails" from previous levels, 
 * ensuring perfectly uniform distribution for the new pool of equations.
 */
export function checkPoolTransition(
  currentLevel: number,
  previousLevel: number,
  currentHistory: Record<string, number>,
  currentQueue: ErrorItem[]
): { historyCounts: Record<string, number>; errorQueue: ErrorItem[]; resetTriggered: boolean } {
  
  // 1. Fetch factor pools for both the current level and the previous level
  const currentPools = getEffectivePools(currentLevel, null);
  const previousPools = getEffectivePools(previousLevel, null);

  // 2. Identify if the first factor pool (f1) array architecture has structurally changed
  const isNewTier = JSON.stringify(currentPools.f1) !== JSON.stringify(previousPools.f1);
  
  // 3. Keep the hard shift constraint for the Nether portal boundary at level 35
  const isNetherShift = currentLevel >= 35 && previousLevel < 35;

  if (isNewTier || isNetherShift) {
    return {
      historyCounts: {}, // Complete wipe for a balanced uniform distribution start
      errorQueue: [],    // Flush old errors so players aren't dragged down by legacy tier mistakes
      resetTriggered: true
    };
  }

  // No transition detected; return original states untampered
  return {
    historyCounts: currentHistory,
    errorQueue: currentQueue,
    resetTriggered: false
  };
}

/**
 * Function 3: generateQuestion(currentLevel, chosenPickaxe, lastQuestion, historyCounts, errorQueue)
 * 
 * Selects the next multiplication equation f1 x f2 utilizing uniform distribution 
 * optimization, consecutive repetitions shielding, and smart practice rehabilitation checking.
 * 
 * @returns Selected equation factors f1 and f2 along with source metadata.
 */
export function generateQuestion(
  currentLevel: number,
  chosenPickaxe: string | null,
  lastQuestion: { f1: number; f2: number } | null,
  historyCounts: Record<string, number>,
  errorQueue: ErrorItem[]
): { f1: number; f2: number; fromQueue: boolean; queueIndex?: number } {
  // 1. Error Queue Check (30% Chance)
  if (errorQueue.length > 0 && Math.random() < 0.3) {
    // Find active elements whose quarantine/cooldown steps have elapsed to 0
    const readyIdx = errorQueue.findIndex(item => item.cooldownSteps === 0);
    if (readyIdx !== -1) {
      const challenge = errorQueue[readyIdx];
      return {
        f1: challenge.f1,
        f2: challenge.f2,
        fromQueue: true,
        queueIndex: readyIdx
      };
    }
  }

  // 2. Standard Selection (70% Chance or if Error Queue has no items ready)
  const { f1: f1Pool, f2: f2Pool } = getEffectivePools(currentLevel, chosenPickaxe);

  // Generate all possible cross-product candidate pairs
  let candidates: { f1: number; f2: number }[] = [];
  for (const factor1 of f1Pool) {
    for (const factor2 of f2Pool) {
      candidates.push({ f1: factor1, f2: factor2 });
    }
  }

  // Consecutive Anti-Repetition Filter:
  // Remove the previous problem and its commutative mirror version
  if (lastQuestion && candidates.length > 2) {
    candidates = candidates.filter(c => 
      !(c.f1 === lastQuestion.f1 && c.f2 === lastQuestion.f2) &&
      !(c.f1 === lastQuestion.f2 && c.f2 === lastQuestion.f1)
    );
  }

  // Uniform Distribution Filter:
  // Extract counts for each candidate and find the minimum solved value
  const candidateCounts = candidates.map(c => ({
    candidate: c,
    count: getSolveCount(c.f1, c.f2, historyCounts)
  }));

  const minCount = Math.min(...candidateCounts.map(item => item.count));

  // Only keep candidate pairs solved minCount times
  const optimalCandidates = candidateCounts
    .filter(item => item.count === minCount)
    .map(item => item.candidate);

  // Pick one target pairs at random from this least-solved group
  const finalCandidates = optimalCandidates.length > 0 ? optimalCandidates : candidates;
  const chosen = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

  return {
    f1: chosen.f1,
    f2: chosen.f2,
    fromQueue: false
  };
}

/**
 * Function 4: handleAnswer(f1, f2, isCorrect, currentStreak, pickaxeMultiplier, xp, historyCounts, errorQueue)
 * 
 * Process answer events. Successfully answered items increment frequency metrics and
 * decrement queues cooldown steps. Failed options are placed in queue with cooldown shielding.
 * Also tracks consecutive correct answers (streaks), calculates streak bonuses, and computes
 * total XP gained.
 * 
 * @returns Updated history records, error queue elements, next streak, streak bonus, total XP gained, and next XP
 */
export function handleAnswer(
  f1: number,
  f2: number,
  isCorrect: boolean,
  currentStreak: number,
  pickaxeMultiplier: number,
  xp: number,
  historyCounts: Record<string, number>,
  errorQueue: ErrorItem[]
): {
  historyCounts: Record<string, number>;
  errorQueue: ErrorItem[];
  nextStreak: number;
  streakBonus: number;
  totalXpGained: number;
  nextXp: number;
} {
  const nextHistory = { ...historyCounts };
  let nextQueue = errorQueue.map(item => ({ ...item }));
  let nextStreak = currentStreak;
  let streakBonus = 0;
  let totalXpGained = 0;
  let nextXp = xp;

  if (isCorrect) {
    // Increment frequency metrics under both naming representations to guarantee cross-compatibility
    const key1 = `${f1}x${f2}`;
    const key2 = `${f1}_${f2}`;
    nextHistory[key1] = (nextHistory[key1] || 0) + 1;
    nextHistory[key2] = (nextHistory[key2] || 0) + 1;

    // Handle standard mathematical commutative mirror properties too
    const keyMirror1 = `${f2}x${f1}`;
    const keyMirror2 = `${f2}_${f1}`;
    nextHistory[keyMirror1] = (nextHistory[keyMirror1] || 0) + 1;
    nextHistory[keyMirror2] = (nextHistory[keyMirror2] || 0) + 1;

    // Decrement cooldown steps for all items currently waiting, clamped at 0
    nextQueue = nextQueue.map(item => ({
      ...item,
      cooldownSteps: Math.max(0, item.cooldownSteps - 1)
    }));

    nextStreak = currentStreak + 1;
    streakBonus = Math.floor(nextStreak / 10);
    const baseXp = 4 * pickaxeMultiplier;
    totalXpGained = baseXp + streakBonus;
    nextXp = xp + totalXpGained;
  } else {
    // Mathematical Failure: Add or update error object inside practice lists
    const existingIndex = nextQueue.findIndex(item => 
      (item.f1 === f1 && item.f2 === f2) || 
      (item.f1 === f2 && item.f2 === f1)
    );

    if (existingIndex !== -1) {
      // Refresh the quarantine cooldown shielding count
      nextQueue[existingIndex].cooldownSteps = 3;
    } else {
      nextQueue.push({
        f1,
        f2,
        cooldownSteps: 3
      });
    }

    nextStreak = 0;
    streakBonus = 0;
    totalXpGained = 0;
    nextXp = xp;
  }

  return {
    historyCounts: nextHistory,
    errorQueue: nextQueue,
    nextStreak,
    streakBonus,
    totalXpGained,
    nextXp
  };
}
