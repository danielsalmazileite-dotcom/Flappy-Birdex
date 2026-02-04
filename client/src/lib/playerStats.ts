// Player stats for unlocking characters
export interface PlayerStats {
  totalFlaps: number;
  bestScore: number;
  bestHardcoreScore: number;
  onlineMatchesPlayed: number;
  onlineMatchesWon: number;
}

import { touchLocalProgressUpdatedAt } from "./cloudProgress";

const STATS_KEY = "flappi_birdex_stats";

const DEFAULT_STATS: PlayerStats = {
  totalFlaps: 0,
  bestScore: 0,
  bestHardcoreScore: 0,
  onlineMatchesPlayed: 0,
  onlineMatchesWon: 0,
};

function toNumberOrZero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function coerceStats(value: unknown): PlayerStats | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as any;
  return {
    totalFlaps: toNumberOrZero(obj.totalFlaps),
    bestScore: toNumberOrZero(obj.bestScore),
    bestHardcoreScore: toNumberOrZero(obj.bestHardcoreScore),
    onlineMatchesPlayed: toNumberOrZero(obj.onlineMatchesPlayed),
    onlineMatchesWon: toNumberOrZero(obj.onlineMatchesWon),
  };
}

export function getPlayerStats(): PlayerStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const coerced = coerceStats(parsed);
      if (coerced) return coerced;
    }
  } catch {}
  return DEFAULT_STATS;
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    touchLocalProgressUpdatedAt();
  } catch {}
}

export function addFlaps(count: number): void {
  const stats = getPlayerStats();
  stats.totalFlaps += count;
  savePlayerStats(stats);
}

export function updateBestScore(score: number, isHardcore: boolean): void {
  const stats = getPlayerStats();
  if (isHardcore) {
    if (score > stats.bestHardcoreScore) {
      stats.bestHardcoreScore = score;
    }
  } else {
    if (score > stats.bestScore) {
      stats.bestScore = score;
    }
  }
  savePlayerStats(stats);
}

export function recordOnlineMatch(won: boolean): void {
  const stats = getPlayerStats();
  stats.onlineMatchesPlayed++;
  if (won) {
    stats.onlineMatchesWon++;
  }
  savePlayerStats(stats);
}

export type CharacterType = "bird" | "soccer" | "baseball" | "tennis" | "fireball" | "smiley" | "golf" | "birdglasses";

export interface CharacterInfo {
  type: CharacterType;
  label: string;
  unlockRequirement: string;
  isUnlocked: (stats: PlayerStats) => boolean;
  page: number;
}

export const CHARACTERS: CharacterInfo[] = [
  // Page 1
  {
    type: "bird",
    label: "Bird",
    unlockRequirement: "Free",
    isUnlocked: () => true,
    page: 1
  },
  {
    type: "tennis",
    label: "Tennis",
    unlockRequirement: "60 points (normal)",
    isUnlocked: (stats) => stats.bestScore >= 60,
    page: 1
  },
  {
    type: "baseball",
    label: "Baseball",
    unlockRequirement: "200 flaps total",
    isUnlocked: (stats) => stats.totalFlaps >= 200,
    page: 1
  },
  {
    type: "soccer",
    label: "Soccer",
    unlockRequirement: "700 flaps total",
    isUnlocked: (stats) => stats.totalFlaps >= 700,
    page: 1
  },
  // Page 2
  {
    type: "fireball",
    label: "Fireball",
    unlockRequirement: "40 points (hardcore)",
    isUnlocked: (stats) => stats.bestHardcoreScore >= 40,
    page: 2
  },
  {
    type: "smiley",
    label: "Smiley",
    unlockRequirement: "1 online match",
    isUnlocked: (stats) => stats.onlineMatchesPlayed >= 1,
    page: 2
  },
  {
    type: "golf",
    label: "Golf",
    unlockRequirement: "10 online matches",
    isUnlocked: (stats) => stats.onlineMatchesPlayed >= 10,
    page: 2
  },
  {
    type: "birdglasses",
    label: "Bird Style",
    unlockRequirement: "20 online wins",
    isUnlocked: (stats) => stats.onlineMatchesWon >= 20,
    page: 2
  }
];

export function getUnlockedCharacters(stats: PlayerStats): CharacterType[] {
  return CHARACTERS.filter(c => c.isUnlocked(stats)).map(c => c.type);
}
