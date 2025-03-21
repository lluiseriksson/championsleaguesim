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
  gameTime: number;
  scoreDifferential: number;
  momentum: number;
  formationCompactness: number;
  formationWidth: number;
  recentSuccessRate: number;
  possessionDuration: number;
  distanceFromFormationCenter: number;
  isInFormationPosition: number;
  teammateDensity: number;
  opponentDensity: number;
  shootingAngle: number;
  shootingQuality: number;
  
  zoneControl: number;           // How well the player's team controls their current zone (0-1)
  passingLanesQuality: number;   // Quality of available passing lanes (0-1)
  spaceCreation: number;         // How well the player is creating/using space (0-1)
  defensiveSupport: number;      // Level of defensive coverage provided (0-1)
  pressureIndex: number;         // Amount of pressure on the player (0-1)
  tacticalRole: number;          // Player's current tactical role effectiveness (0-1)
  supportPositioning: number;    // Quality of supporting position for teammates (0-1)
  pressingEfficiency: number;    // Effectiveness of pressing actions (0-1)
  coverShadow: number;          // How well player cuts passing lanes (0-1)
  verticalSpacing: number;      // Team's vertical spacing quality (0-1)
  horizontalSpacing: number;    // Team's horizontal spacing quality (0-1)
  territorialControl: number;   // Control over current territory (0-1)
  counterAttackPotential: number; // Potential for counter-attack success (0-1)
  pressureResistance: number;   // Ability to resist opponent pressure (0-1)
  recoveryPosition: number;     // Quality of position for defensive recovery (0-1)
  transitionSpeed: number;      // Speed of tactical transitions (0-1)
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

export interface PassOutcome {
  success: boolean;
  targetId: number;
}

export interface NeuralNet {
  net: brain.NeuralNetwork<NeuralInput, NeuralOutput>;
  lastOutput: { x: number; y: number };
  lastAction?: 'move' | 'shoot' | 'pass' | 'intercept';
  lastShotDirection?: Position;        // Add this property for tracking shot direction
  lastPassOutcome?: PassOutcome;       // Add this property for tracking pass outcomes
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

export type KitType = 'home' | 'away' | 'third' | 'special';

export interface Player {
  id: number;
  position: Position;
  velocity: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
  kit: string;
  brain: NeuralNet | null;
  force: Position;
  name: string;
  goals: number;
  assists: number;
  isVirtual?: boolean;
  radius: number;
  targetPosition: Position;  // Changed from optional to required
  teamName?: string;  
  kitType?: KitType;  
  teamElo?: number;   
}

export interface Ball {
  position: Position;
  velocity: Position;
  previousPosition?: Position;
  lastKickBy?: Player;
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
export const GOAL_HEIGHT = 184; // Increased from 160 (160 * 1.15 = 184)
export const PLAYER_RADIUS = 12;
export const BALL_RADIUS = 6;
export const PLAYER_SPEED = 2;
export const SHOOT_POWER = 15;
export const PASS_POWER = 8;
