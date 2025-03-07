import { Player, Ball, NeuralInput, TeamContext, NeuralNet, Position, GOAL_HEIGHT } from '../types/football';
import { calculateDistance } from './neuralHelpers';

// Maximum number of actions to track in history
const MAX_ACTION_HISTORY = 20;

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
