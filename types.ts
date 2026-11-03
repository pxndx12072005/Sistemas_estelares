export type SolutionType = 'UNICA' | 'INFINITAS' | 'NINGUNA';

export interface Fraction {
  n: number;
  d: number;
}

export interface SystemProblem {
  id: string;
  sector: number;
  equations: string[];
  numVars: 2 | 3;
  type: SolutionType | string; // For k-questions, it can be the correct k option e.g. "k = 2"
  isKQuestion?: boolean;
  kOptions?: string[];
  kPrompt?: string;
  kSubstitutedNote?: string;
  rankA: number;
  rankAb: number;
  solution?: number[];
  solutionStr?: string;
  explanationNote: string;
  hasSensorDamage?: boolean;
  // Raw matrix representation of [A | b] with Fractions
  initialMatrix: Fraction[][];
  // Geometric coefficients for 3D visualization: [a, b, c, d] for ax + by (+ cz) = d
  planesOrLines: { a: number; b: number; c: number; d: number }[];
}

export type GameStatus =
  | 'START'
  | 'HOW_TO_PLAY'
  | 'GALAXY_MAP'
  | 'PLAYING'
  | 'LOCKED_REVELATION'
  | 'PAUSED'
  | 'MISSION_REPORT'
  | 'GAME_OVER'
  | 'VICTORY';

export interface SectorProgress {
  sector: number;
  unlocked: boolean;
  stars: number;
  bestScore: number;
  cleared: boolean;
}

export interface PlayerStats {
  correctCount: number;
  totalAttempts: number;
  correctByType: Record<SolutionType, number>;
  wrongByType: Record<SolutionType, number>;
  justificationsCorrect: number;
  justificationsAttempted: number;
  coordinatesCorrect: number;
  coordinatesAttempted: number;
  roundTimes: number[];
}
