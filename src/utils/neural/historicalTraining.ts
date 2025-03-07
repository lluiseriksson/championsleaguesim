
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
    
    // Load historical game data from the database
    const { data: gameData, error } = await supabase
      .from('game_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200); // Limit to most recent 200 entries
    
    if (error || !gameData || gameData.length === 0) {
      console.warn('No historical game data found', error);
      
      // If no data exists yet, let's create a sample entry for future training
      if (!gameData || gameData.length === 0) {
        const randomPlayer = validPlayers[0];
        await saveSampleGameData(randomPlayer);
      }
      
      return null;
    }
    
    console.log(`Found ${gameData.length} historical game entries for training`);
    
    // Process each player that needs to be trained
    const updatedPlayers = await Promise.all(
      validPlayers.map(async (player) => {
        try {
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
          
          // Prepare training data
          const trainingData = relevantData.map(entry => ({
            input: entry.inputs,
            output: entry.outputs
          }));
          
          // Train the neural network on historical data
          try {
            // Only train if we have enough data
            if (trainingData.length >= 5) {
              player.brain.net.train(trainingData, {
                iterations: Math.min(50, trainingData.length * 2),
                errorThresh: 0.05,
                learningRate: 0.1,
                log: false
              });
              
              console.log(`Successfully trained ${player.team} ${player.role} on ${trainingData.length} examples`);
              
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
    const gameInstance: Partial<GameInstance> = {
      team: player.team,
      role: player.role,
      action: player.brain.lastAction,
      // Use simplified version of inputs to avoid DB size issues
      inputs: player.brain.actionHistory?.[player.brain.actionHistory.length - 1]?.context as NeuralInput || {},
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
    
    // Save the game instance to the database
    const { error } = await supabase
      .from('game_history')
      .insert(gameInstance);
    
    if (error) {
      console.error('Error saving game history:', error);
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
      inputs: {
        ballX: 0.7,
        ballY: 0.5,
        playerX: 0.7,
        playerY: 0.5,
        ballVelocityX: 0.01,
        ballVelocityY: 0,
        distanceToGoal: 0.2,
        angleToGoal: 0,
        nearestTeammateDistance: 0.3,
        nearestTeammateAngle: 0.1,
        nearestOpponentDistance: 0.4,
        nearestOpponentAngle: 0.2,
        isInShootingRange: 1,
        isInPassingRange: 0,
        isDefendingRequired: 0,
        distanceToOwnGoal: 0.8,
        angleToOwnGoal: 0.5,
        isFacingOwnGoal: 0,
        isDangerousPosition: 0,
        isBetweenBallAndOwnGoal: 0,
        teamElo: 0.6,
        eloAdvantage: 0.1,
        gameTime: 0.5,
        scoreDifferential: 0,
        momentum: 0.6,
        formationCompactness: 0.5,
        formationWidth: 0.5,
        recentSuccessRate: 0.7,
        possessionDuration: 0.3,
        distanceFromFormationCenter: 0.2,
        isInFormationPosition: 1,
        teammateDensity: 0.4,
        opponentDensity: 0.3,
        shootingAngle: 0.8,
        shootingQuality: 0.7,
        zoneControl: 0.6,
        passingLanesQuality: 0.5,
        spaceCreation: 0.6,
        defensiveSupport: 0.4,
        pressureIndex: 0.3,
        tacticalRole: 0.7,
        supportPositioning: 0.6,
        pressingEfficiency: 0.5,
        coverShadow: 0.4,
        verticalSpacing: 0.5,
        horizontalSpacing: 0.5,
        territorialControl: 0.6,
        counterAttackPotential: 0.7,
        pressureResistance: 0.6,
        recoveryPosition: 0.4,
        transitionSpeed: 0.6
      },
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
