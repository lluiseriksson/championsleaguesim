
import { supabase } from '../../integrations/supabase/client';
import { Player, NeuralNet, NeuralInput, NeuralOutput } from '../../types/football';
import { toast } from 'sonner';
import { isNetworkValid } from '../neuralHelpers';
import { calculateNetworkInputs } from '../neuralInputs';
import { loadModel } from './modelPersistence';

interface GameInstance {
  team: string;
  role: string;
  action: 'move' | 'shoot' | 'pass' | 'intercept';
  inputs: NeuralInput;
  outputs: NeuralOutput;
  reward: number;
  success: boolean;
  timestamp: string;
}

// Default neural input to ensure all fields are populated
const DEFAULT_NEURAL_INPUT: NeuralInput = {
  ballX: 0.5,
  ballY: 0.5,
  playerX: 0.5,
  playerY: 0.5,
  ballVelocityX: 0,
  ballVelocityY: 0,
  distanceToGoal: 0.5,
  angleToGoal: 0,
  nearestTeammateDistance: 0.5,
  nearestTeammateAngle: 0,
  nearestOpponentDistance: 0.5,
  nearestOpponentAngle: 0,
  isInShootingRange: 0,
  isInPassingRange: 0,
  isDefendingRequired: 0,
  distanceToOwnGoal: 0.5,
  angleToOwnGoal: 0,
  isFacingOwnGoal: 0,
  isDangerousPosition: 0,
  isBetweenBallAndOwnGoal: 0,
  teamElo: 0.5,
  eloAdvantage: 0,
  gameTime: 0.5,
  scoreDifferential: 0,
  momentum: 0.5,
  formationCompactness: 0.5,
  formationWidth: 0.5,
  recentSuccessRate: 0.5,
  possessionDuration: 0,
  distanceFromFormationCenter: 0.5,
  isInFormationPosition: 1,
  teammateDensity: 0.5,
  opponentDensity: 0.5,
  shootingAngle: 0.5,
  shootingQuality: 0.5,
  zoneControl: 0.5,
  passingLanesQuality: 0.5,
  spaceCreation: 0.5,
  defensiveSupport: 0.5,
  pressureIndex: 0.5,
  tacticalRole: 0.5,
  supportPositioning: 0.5,
  pressingEfficiency: 0.5,
  coverShadow: 0.5,
  verticalSpacing: 0.5,
  horizontalSpacing: 0.5,
  territorialControl: 0.5,
  counterAttackPotential: 0.5,
  pressureResistance: 0.5,
  recoveryPosition: 0.5,
  transitionSpeed: 0.5
};

// Cache to avoid repeatedly fetching the same data
const trainingDataCache = new Map<string, { timestamp: number, data: any[] }>();

/**
 * Trains neural networks from historical game data
 */
export const trainFromPreviousGames = async (players: Player[]): Promise<Player[] | null> => {
  try {
    console.log('Loading historical game data for training...');
    
    // Get the players who have valid neural networks and can be trained
    const validPlayers = players.filter(player => 
      player.brain && 
      player.brain.net && 
      isNetworkValid(player.brain.net)
    );
    
    if (validPlayers.length === 0) {
      console.warn('No valid players found for historical training');
      return null;
    }
    
    // Check cache first to avoid frequent database queries
    const cacheKey = 'game_history';
    const cachedData = trainingDataCache.get(cacheKey);
    let gameData;
    
    // Use cache if it's less than 2 minutes old
    if (cachedData && (Date.now() - cachedData.timestamp) < 120000) {
      console.log('Using cached game history data');
      gameData = cachedData.data;
    } else {
      // Load historical game data from the database
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(150); // Reduced from 200 to improve performance
      
      if (error || !data || data.length === 0) {
        console.warn('No historical game data found', error);
        
        // If no data exists yet, let's create a sample entry for future training
        if (!data || data.length === 0) {
          const randomPlayer = validPlayers[0];
          await saveSampleGameData(randomPlayer);
        }
        
        return null;
      }
      
      gameData = data;
      
      // Update cache
      trainingDataCache.set(cacheKey, {
        timestamp: Date.now(),
        data: gameData
      });
    }
    
    console.log(`Found ${gameData.length} historical game entries for training`);
    
    // Only train a subset of players each time to reduce load
    const playersToTrain = validPlayers.slice(0, 4);
    console.log(`Training ${playersToTrain.length} players this cycle`);
    
    // Process each player that needs to be trained
    const updatedPlayers = await Promise.all(
      validPlayers.map(async (player, index) => {
        try {
          // Only train players in current batch
          if (playersToTrain.findIndex(p => p.id === player.id) === -1) {
            return player;
          }
          
          // Get relevant historical data for this player's team and role
          const relevantData = gameData.filter(entry => 
            entry.team === player.team && 
            entry.role === player.role &&
            entry.success === true // Only train on successful examples
          );
          
          if (relevantData.length === 0) {
            console.log(`No relevant historical data for ${player.team} ${player.role}`);
            
            // Save current gameplay for future training
            await saveCurrentGameData(player);
            return player;
          }
          
          console.log(`Training ${player.team} ${player.role} on ${relevantData.length} historical examples`);
          
          // Prepare training data - limit to most recent 20 examples to prevent overtraining
          const trainingData = relevantData.slice(0, 20).map(entry => ({
            input: entry.inputs,
            output: entry.outputs
          }));
          
          // Train the neural network on historical data
          try {
            // Only train if we have enough data
            if (trainingData.length >= 3) {
              // Use reduced training iterations to prevent freezing
              const iterations = Math.min(30, trainingData.length * 2);
              
              player.brain.net.train(trainingData, {
                iterations: iterations,
                errorThresh: 0.05,
                learningRate: 0.1,
                log: false
              });
              
              console.log(`Successfully trained ${player.team} ${player.role} on ${trainingData.length} examples with ${iterations} iterations`);
              
              // Save the current game state for future training
              await saveCurrentGameData(player);
            }
          } catch (trainError) {
            console.error(`Error training ${player.team} ${player.role}:`, trainError);
          }
          
          return player;
        } catch (playerError) {
          console.error(`Error processing player ${player.team} ${player.role}:`, playerError);
          return player;
        }
      })
    );
    
    return updatedPlayers;
  } catch (e) {
    console.error('Error in historical training:', e);
    return null;
  }
};

/**
 * Save the current game state of a player for future training
 */
const saveCurrentGameData = async (player: Player): Promise<void> => {
  if (!player.brain.lastAction || !player.brain.lastOutput) {
    return;
  }
  
  try {
    // Create a sample game instance from current player state
    const inputs = player.brain.actionHistory?.[player.brain.actionHistory.length - 1]?.context as NeuralInput;
    
    // Merge the actual inputs with default values to ensure all required properties exist
    const validInputs: NeuralInput = inputs ? { ...DEFAULT_NEURAL_INPUT, ...inputs } : DEFAULT_NEURAL_INPUT;
    
    const gameInstance: Partial<GameInstance> = {
      team: player.team,
      role: player.role,
      action: player.brain.lastAction,
      // Use validated inputs to avoid type errors
      inputs: validInputs,
      outputs: {
        moveX: player.brain.lastOutput.x || 0,
        moveY: player.brain.lastOutput.y || 0,
        shootBall: player.brain.lastAction === 'shoot' ? 1 : 0,
        passBall: player.brain.lastAction === 'pass' ? 1 : 0,
        intercept: player.brain.lastAction === 'intercept' ? 1 : 0
      },
      reward: player.brain.lastReward || 0,
      success: player.brain.successRate?.overall && player.brain.successRate.overall > 0.5,
      timestamp: new Date().toISOString()
    };
    
    // Only save successful games to reduce database size
    if (gameInstance.success) {
      // Save the game instance to the database
      const { error } = await supabase
        .from('game_history')
        .insert(gameInstance);
      
      if (error) {
        console.error('Error saving game history:', error);
      }
    }
  } catch (e) {
    console.error('Error saving current game data:', e);
  }
};

/**
 * Create a sample game data entry for future training
 */
const saveSampleGameData = async (player: Player): Promise<void> => {
  try {
    const sampleGameInstance: Partial<GameInstance> = {
      team: player.team,
      role: player.role,
      action: 'shoot',
      inputs: DEFAULT_NEURAL_INPUT,
      outputs: {
        moveX: 0.8,
        moveY: 0.5,
        shootBall: 1,
        passBall: 0,
        intercept: 0
      },
      reward: 1.5,
      success: true,
      timestamp: new Date().toISOString()
    };
    
    // Save the sample game instance to the database
    const { error } = await supabase
      .from('game_history')
      .insert(sampleGameInstance);
    
    if (error) {
      console.error('Error saving sample game history:', error);
    } else {
      console.log('Created sample game history entry for future training');
    }
  } catch (e) {
    console.error('Error creating sample game data:', e);
  }
};

/**
 * Utility function to sync a player's historical training data
 */
export const syncPlayerHistoricalData = async (player: Player): Promise<void> => {
  if (!player.brain || !player.brain.lastAction) {
    return;
  }
  
  try {
    await saveCurrentGameData(player);
    console.log(`Synced historical data for ${player.team} ${player.role}`);
  } catch (e) {
    console.error('Error syncing player historical data:', e);
  }
};
