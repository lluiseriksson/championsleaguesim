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
  shootingAngle: number;    // Best angle for shooting (0-1, normalized from 0-2π)
  shootingQuality: number;  // Quality of best shooting opportunity (0-1)
}

export interface NeuralOutput {
  [key: string]: number; // Index signature
  moveX: number;
  moveY: number;
  shootBall: number;
  passBall: number;
  intercept: number;
}

export interface ExperienceReplay {
  inputs: NeuralInput[];
  outputs: NeuralOutput[];
  rewards: number[];
  priorities: number[];  // For prioritized experience replay
  timestamps: number[];  // When the experience was recorded
  capacity: number;      // Maximum buffer size
  currentIndex: number;  // Current position in the buffer
}

export type NetworkSpecialization = 
  | 'general'      // General-purpose network
  | 'attacking'    // Specialized for attacking situations
  | 'defending'    // Specialized for defending situations
  | 'possession'   // Specialized for maintaining possession
  | 'transition'   // Specialized for transition play
  | 'setpiece'     // Specialized for set pieces
  | 'selector'     // Network that selects which specialized network to use
  | 'meta';        // Meta-network that combines outputs

export interface SituationContext {
  isDefensiveThird: boolean;    // Player is in defensive third of field
  isMiddleThird: boolean;       // Player is in middle third of field
  isAttackingThird: boolean;    // Player is in attacking third of field
  hasTeamPossession: boolean;   // Team has possession of the ball
  isSetPiece: boolean;          // Currently in a set piece situation
  isTransitioning: boolean;     // Team is transitioning between defense/attack
  distanceToBall: number;       // Distance to ball (normalized 0-1)
  distanceToOwnGoal: number;    // Distance to own goal (normalized 0-1)
  distanceToOpponentGoal: number; // Distance to opponent goal (normalized 1)
  defensivePressure: number;    // Level of defensive pressure (0-1)
}

export interface SpecializedNeuralNet {
  type: NetworkSpecialization;
  net: brain.NeuralNetwork<NeuralInput, NeuralOutput>;
  confidence: number;           // How confident this network is in current situation (0-1)
  performance: {                // Performance metrics for this specialized network
    overallSuccess: number;     // Overall success rate (0-1)
    situationSuccess: number;   // Success rate in its specialized situation (0-1)
    usageCount: number;         // How many times this network has been used
  };
}

export interface NeuralNet {
  net: brain.NeuralNetwork<NeuralInput, NeuralOutput>;
  lastOutput: { x: number; y: number };
  lastAction?: 'move' | 'shoot' | 'pass' | 'intercept';
  // Performance tracking
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
  // Experience replay properties
  experienceReplay?: ExperienceReplay;
  learningStage?: number;       // For curriculum learning (0-1)
  lastReward?: number;          // For delayed reward tracking
  cumulativeReward?: number;    // Track total rewards over time
  
  // New properties for specialized networks
  specializedNetworks?: SpecializedNeuralNet[];
  selectorNetwork?: SpecializedNeuralNet;
  metaNetwork?: SpecializedNeuralNet;
  currentSpecialization?: NetworkSpecialization;
  lastSituationContext?: SituationContext;
}

export type KitType = 'home' | 'away' | 'third';

export interface Player {
  id: number;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
  brain: NeuralNet;
  targetPosition: Position;
  teamName?: string;  
  kitType?: KitType;  
  teamElo?: number;   
  radius: number;     // Add radius property for collision detection
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
