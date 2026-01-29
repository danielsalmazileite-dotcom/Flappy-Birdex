// Player stats for unlocking characters
export interface PlayerStats {
  totalFlaps: number;
  bestScore: number;
  bestHardcoreScore: number;
  onlineMatchesPlayed: number;
  onlineMatchesWon: number;
}

const STATS_KEY = "flappi_birdex_stats";

export function getPlayerStats(): PlayerStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return {
    totalFlaps: 0,
    bestScore: 0,
    bestHardcoreScore: 0,
    onlineMatchesPlayed: 0,
    onlineMatchesWon: 0
  };
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
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
    label: "Passarinho",
    unlockRequirement: "Gratuito",
    isUnlocked: () => true,
    page: 1
  },
  {
    type: "tennis",
    label: "Tennis",
    unlockRequirement: "60 pontos (normal)",
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
    label: "Futebol",
    unlockRequirement: "700 flaps total",
    isUnlocked: (stats) => stats.totalFlaps >= 700,
    page: 1
  },
  // Page 2
  {
    type: "fireball",
    label: "Bola de Fogo",
    unlockRequirement: "40 pontos (hardcore)",
    isUnlocked: (stats) => stats.bestHardcoreScore >= 40,
    page: 2
  },
  {
    type: "smiley",
    label: "Smiley",
    unlockRequirement: "1 partida online",
    isUnlocked: (stats) => stats.onlineMatchesPlayed >= 1,
    page: 2
  },
  {
    type: "golf",
    label: "Golf",
    unlockRequirement: "10 partidas online",
    isUnlocked: (stats) => stats.onlineMatchesPlayed >= 10,
    page: 2
  },
  {
    type: "birdglasses",
    label: "Bird Style",
    unlockRequirement: "20 vitórias online",
    isUnlocked: (stats) => stats.onlineMatchesWon >= 20,
    page: 2
  }
];

export function getUnlockedCharacters(stats: PlayerStats): CharacterType[] {
  return CHARACTERS.filter(c => c.isUnlocked(stats)).map(c => c.type);
}
