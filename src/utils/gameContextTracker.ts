
import { Player, Ball, NeuralInput, TeamContext, NeuralNet, Position, GOAL_HEIGHT } from '../types/football';
import { calculateDistance } from './neuralHelpers';

// Maximum number of actions to track in history
const MAX_ACTION_HISTORY = 20;

// Track the last few team actions for goal contribution analysis
const MAX_TEAM_ACTIONS = 8;
const CONTRIBUTION_WINDOW_MS = 8000; // 8 seconds window for goal contributions

// Initialize action history for a player
export const initializeActionHistory = (brain: NeuralNet): NeuralNet => {
  return {
    ...brain,
    actionHistory: [],
    successRate: {
      shoot: 0.5,
      pass: 0.5,
      intercept: 0.5,
      overall: 0.5
    }
  };
};

// Create team action tracker for goal contribution analysis
export const createTeamActionTracker = () => {
  return {
    actions: [] as {
      playerId: number;
      playerRole: string;
      action: string;
      timestamp: number;
      position: Position;
      teamElo?: number;
    }[],
    lastUpdated: Date.now()
  };
};

// Add action to team tracker
export const trackTeamAction = (
  tracker: ReturnType<typeof createTeamActionTracker>, 
  player: Player,
  action: string
) => {
  // Add new action
  tracker.actions.push({
    playerId: player.id,
    playerRole: player.role,
    action,
    timestamp: Date.now(),
    position: { ...player.position },
    teamElo: player.teamElo
  });
  
  // Update timestamp
  tracker.lastUpdated = Date.now();
  
  // Limit size and remove old actions
  const cutoffTime = Date.now() - CONTRIBUTION_WINDOW_MS;
  tracker.actions = tracker.actions
    .filter(a => a.timestamp >= cutoffTime)
    .slice(-MAX_TEAM_ACTIONS);
  
  return tracker;
};

// Calculate contribution value for a player's action with ELO consideration
export const calculateContributionValue = (
  action: string,
  playerRole: string,
  timeSinceAction: number,
  teamElo?: number
): number => {
  // Base value depends on action type
  let baseValue = 0;
  switch (action) {
    case 'pass':
      baseValue = 0.8;
      break;
    case 'shoot':
      baseValue = 1.0;
      break;
    case 'intercept':
      baseValue = 0.7;
      break;
    case 'move':
      baseValue = 0.3;
      break;
    default:
      baseValue = 0.1;
  }
  
  // Role-based multiplier
  let roleMultiplier = 1.0;
  switch (playerRole) {
    case 'forward':
      roleMultiplier = 1.2;
      break;
    case 'midfielder':
      roleMultiplier = 1.4; // Midfielders get higher multiplier for build-up play
      break;
    case 'defender':
      roleMultiplier = 0.8;
      break;
    case 'goalkeeper':
      roleMultiplier = 0.5;
      break;
  }
  
  // Time decay - actions closer to goal are worth more
  // 8 second window for contributions
  const timeDecay = Math.max(0, 1 - (timeSinceAction / CONTRIBUTION_WINDOW_MS));
  
  // NEW: ELO-based multiplier - higher ELO teams get bigger contributions
  const eloMultiplier = teamElo ? Math.min(1.5, 1 + ((teamElo - 2000) / 1000)) : 1.0;
  
  return baseValue * roleMultiplier * timeDecay * eloMultiplier;
};

// Analyze contribution chain for goal with ELO weighting
export const analyzeGoalContributions = (
  tracker: ReturnType<typeof createTeamActionTracker>,
  goalTimestamp: number
): {
  playerId: number;
  contributionValue: number;
}[] => {
  const contributions: {
    playerId: number;
    contributionValue: number;
  }[] = [];
  
  // Map to track each player's total contribution
  const playerContributions = new Map<number, number>();
  
  // Calculate contribution for each action
  tracker.actions.forEach(action => {
    const timeSinceAction = goalTimestamp - action.timestamp;
    
    // Only consider actions within contribution window
    if (timeSinceAction <= CONTRIBUTION_WINDOW_MS) {
      const value = calculateContributionValue(
        action.action,
        action.playerRole,
        timeSinceAction,
        action.teamElo
      );
      
      // Add to player's total
      const currentValue = playerContributions.get(action.playerId) || 0;
      playerContributions.set(action.playerId, currentValue + value);
    }
  });
  
  // Convert map to array
  playerContributions.forEach((value, playerId) => {
    contributions.push({
      playerId,
      contributionValue: value
    });
  });
  
  return contributions;
};

// Track action outcomes
export const recordActionOutcome = (
  brain: NeuralNet,
  action: 'shoot' | 'pass' | 'intercept' | 'move',
  success: boolean,
  context: Partial<NeuralInput>
): NeuralNet => {
  if (!brain.actionHistory) {
    brain = initializeActionHistory(brain);
  }
  
  // Add new action to history
  const newHistory = [
    ...brain.actionHistory!,
    {
      action,
      success,
      context,
      timestamp: Date.now()
    }
  ];
  
  // Limit history size
  if (newHistory.length > MAX_ACTION_HISTORY) {
    newHistory.shift();
  }
  
  // Update success rates
  const successRates = calculateSuccessRates(newHistory);
  
  return {
    ...brain,
    actionHistory: newHistory,
    successRate: successRates
  };
};

// Calculate success rates from action history
const calculateSuccessRates = (history: any[]) => {
  const rates = {
    shoot: 0.5,
    pass: 0.5,
    intercept: 0.5,
    overall: 0.5
  };
  
  const actionCounts = {
    shoot: 0,
    pass: 0,
    intercept: 0,
    total: 0
  };
  
  const actionSuccess = {
    shoot: 0,
    pass: 0,
    intercept: 0,
    total: 0
  };
  
  // Count successes for each action type
  history.forEach(item => {
    if (item.action === 'shoot') {
      actionCounts.shoot++;
      if (item.success) actionSuccess.shoot++;
    } else if (item.action === 'pass') {
      actionCounts.pass++;
      if (item.success) actionSuccess.pass++;
    } else if (item.action === 'intercept') {
      actionCounts.intercept++;
      if (item.success) actionSuccess.intercept++;
    }
    
    actionCounts.total++;
    if (item.success) actionSuccess.total++;
  });
  
  // Calculate rates
  if (actionCounts.shoot > 0) rates.shoot = actionSuccess.shoot / actionCounts.shoot;
  if (actionCounts.pass > 0) rates.pass = actionSuccess.pass / actionCounts.pass;
  if (actionCounts.intercept > 0) rates.intercept = actionSuccess.intercept / actionCounts.intercept;
  if (actionCounts.total > 0) rates.overall = actionSuccess.total / actionCounts.total;
  
  return rates;
};

// Track formation state for a team
export const trackFormation = (players: Player[]): { 
  redFormation: Position[], 
  blueFormation: Position[] 
} => {
  const redTeam = players.filter(p => p.team === 'red');
  const blueTeam = players.filter(p => p.team === 'blue');
  
  return {
    redFormation: redTeam.map(p => p.position),
    blueFormation: blueTeam.map(p => p.position)
  };
};

// Track possession
export const trackPossession = (
  ball: Ball, 
  players: Player[], 
  currentPossession: {
    team: 'red' | 'blue' | null,
    player: number | null,
    duration: number
  }
): {
  team: 'red' | 'blue' | null,
  player: number | null,
  duration: number
} => {
  // Find closest player to the ball
  let closestPlayer: Player | null = null;
  let closestDistance = Infinity;
  
  players.forEach(player => {
    const distance = Math.sqrt(
      Math.pow(player.position.x - ball.position.x, 2) +
      Math.pow(player.position.y - ball.position.y, 2)
    );
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlayer = player;
    }
  });
  
  // Check if any player is close enough to possess the ball
  if (closestPlayer && closestDistance < 30) {
    // If same team/player still has possession, increment duration
    if (currentPossession.team === closestPlayer.team && 
        currentPossession.player === closestPlayer.id) {
      return {
        ...currentPossession,
        duration: currentPossession.duration + 1
      };
    }
    
    // New possession
    return {
      team: closestPlayer.team,
      player: closestPlayer.id,
      duration: 0
    };
  }
  
  // No possession
  return {
    team: null,
    player: null,
    duration: 0
  };
};

// Create the full game context for neural network input
export const createGameContext = (
  elapsedTime: number,
  totalTime: number,
  score: { red: number, blue: number },
  playerTeam: 'red' | 'blue',
  possession: { team: 'red' | 'blue' | null, duration: number },
  formations: { redFormation: Position[], blueFormation: Position[] },
  player: Player
): any => {
  // Normalize game time (0-1)
  const gameTime = Math.min(1, elapsedTime / totalTime);
  
  // Calculate score differential from player's perspective (-1 to 1)
  const scoreDifferential = playerTeam === 'red' 
    ? (score.red - score.blue) / Math.max(1, score.red + score.blue)
    : (score.blue - score.red) / Math.max(1, score.red + score.blue);
  
  return {
    gameTime,
    scoreDifferential,
    possession: {
      team: possession.team,
      duration: possession.duration
    },
    teamFormation: playerTeam === 'red' ? formations.redFormation : formations.blueFormation,
    actionHistory: player.brain.actionHistory || []
  };
};
