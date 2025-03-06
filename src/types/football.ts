import * as brain from 'brain.js';

export interface Position {
  x: number;
  y: number;
}

export interface TeamContext {
  teammates: Position[];
  opponents: Position[];
  ownGoal: Position;
  opponentGoal: Position;
  gameTime?: number;            // Normalized game time (0-1)
  scoreDiff?: number;           // Score differential from perspective of current team
  possessionDuration?: number;  // How long team has had possession
  formationCompactness?: number; // How compact team formation is (0-1)
  formationWidth?: number;      // Width of team formation (0-1)
  distanceFromCenter?: number;  // How far from team's formation center (0-1)
  isInPosition?: boolean;       // Whether player is in correct position
  teammateDensity?: number;     // Density of teammates around player (0-1)
  opponentDensity?: number;     // Density of opponents around player (0-1)
}

export interface NeuralInput {
  [key: string]: number; // Index signature
  ballX: number;
  ballY: number;
  playerX: number;
  playerY: number;
  ballVelocityX: number;
  ballVelocityY: number;
  distanceToGoal: number;
  angleToGoal: number;
  nearestTeammateDistance: number;
  nearestTeammateAngle: number;
  nearestOpponentDistance: number;
  nearestOpponentAngle: number;
  isInShootingRange: number;
  isInPassingRange: number;
  isDefendingRequired: number;
  distanceToOwnGoal: number;
  angleToOwnGoal: number;
  isFacingOwnGoal: number;
  isDangerousPosition: number;
  isBetweenBallAndOwnGoal: number;
  teamElo: number;
  eloAdvantage: number;
  
  gameTime: number;                // Normalized game time (0-1)
  scoreDifferential: number;       // Normalized score difference (-1 to 1)
  momentum: number;                // Team momentum indicator (0-1)
  formationCompactness: number;    // How compact team formation is (0-1)
  formationWidth: number;          // Width of team formation (0-1)
  recentSuccessRate: number;       // Success rate of recent actions (0-1)
  possessionDuration: number;      // How long team has had possession (0-1)
  distanceFromFormationCenter: number; // How far from team's formation center (0-1)
  isInFormationPosition: number;   // Whether player is in correct position (0-1)
  teammateDensity: number;         // Density of teammates around player (0-1)
  opponentDensity: number;         // Density of opponents around player (0-1)
}

export interface NeuralOutput {
  [key: string]: number; // Añadimos index signature
  moveX: number;
  moveY: number;
  shootBall: number;
  passBall: number;
  intercept: number;
}

export interface NeuralNet {
  net: brain.NeuralNetwork<NeuralInput, NeuralOutput>;
  lastOutput: { x: number; y: number };
  lastAction?: 'move' | 'shoot' | 'pass' | 'intercept';
  // New properties for tracking performance
  actionHistory?: {
    action: string;
    success: boolean;
    context: Partial<NeuralInput>;
    timestamp: number;
  }[];
  successRate?: {
    shoot: number;
    pass: number;
    intercept: number;
    overall: number;
  };
}

export type KitType = 'home' | 'away' | 'third';

export interface Player {
  id: number;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
  brain: NeuralNet;
  targetPosition: Position;
  teamName?: string;  // Actual team name like "Barcelona", "Liverpool", etc.
  kitType?: KitType;  // Which kit the player is wearing (home/away/third)
  teamElo?: number;   // The ELO rating of the player's team
}

export interface Ball {
  position: Position;
  velocity: Position;
  bounceDetection?: {
    consecutiveBounces: number;
    lastBounceTime: number;
    lastBounceSide: string;
    sideEffect: boolean;
  };
}

export interface Score {
  red: number;
  blue: number;
}

export const PITCH_WIDTH = 800;
export const PITCH_HEIGHT = 600;
export const GOAL_WIDTH = 120;
export const GOAL_HEIGHT = 160;
export const PLAYER_RADIUS = 12;
export const BALL_RADIUS = 6;
export const PLAYER_SPEED = 2;
export const SHOOT_POWER = 15;
export const PASS_POWER = 8;
