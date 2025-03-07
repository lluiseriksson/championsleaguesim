
import React from 'react';
import { Position, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT, PITCH_WIDTH, Player, Ball } from '../../types/football';
import { Score } from '../../types/football';
import { updatePlayerBrain } from '../../utils/brainTraining';
import { saveModel } from '../../utils/neuralModelService';
import { calculateTacticalReward } from '../../utils/experienceReplay';

interface GoalSystemProps {
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  getTeamContext: (player: Player) => any;
  ball: Ball;
  lastPlayerTouchRef: React.MutableRefObject<Player | null>;
  tournamentMode?: boolean;
}

// Return a hook with goal-related functions instead of a React component
export const useGoalSystem = ({ 
  setScore, 
  players, 
  setPlayers, 
  getTeamContext, 
  ball,
  lastPlayerTouchRef,
  tournamentMode = false
}: GoalSystemProps) => {
  // Track the last player action for reward assignment
  const lastActionRef = React.useRef<{
    player: Player | null;
    action: 'shoot' | 'pass' | 'intercept' | 'move' | null;
    targetPlayer: Player | null;
    timestamp: number;
  }>({
    player: null,
    action: null,
    targetPlayer: null,
    timestamp: 0
  });

  // Track if a shot is on target for reward purposes
  const trackShotOnTarget = React.useCallback((shooter: Player, shotVelocity: Position) => {
    // Record the shot attempt for reward calculation
    lastActionRef.current = {
      player: shooter,
      action: 'shoot',
      targetPlayer: null,
      timestamp: Date.now()
    };

    // Record shot direction in player brain for reward calculation
    if (shooter.brain) {
      // Make sure we're adding the property safely
      shooter.brain.lastShotDirection = shotVelocity;
    }
    
    if (!tournamentMode) {
      console.log(`SHOT TRACKED: ${shooter.team} ${shooter.role} #${shooter.id} shot with velocity (${shotVelocity.x.toFixed(1)}, ${shotVelocity.y.toFixed(1)})`);
    }
  }, [tournamentMode]);

  // Track pass attempts for reward purposes
  const trackPassAttempt = React.useCallback((passer: Player, targetPlayer: Player | null) => {
    lastActionRef.current = {
      player: passer,
      action: 'pass',
      targetPlayer,
      timestamp: Date.now()
    };
    
    // Update brain with pass outcome information
    if (passer.brain && targetPlayer) {
      passer.brain.lastPassOutcome = {
        success: targetPlayer.team === passer.team,
        targetId: targetPlayer.id
      };
    }
    
    if (!tournamentMode) {
      if (targetPlayer) {
        console.log(`PASS TRACKED: ${passer.team} ${passer.role} #${passer.id} passed to ${targetPlayer.team} ${targetPlayer.role} #${targetPlayer.id}`);
      } else {
        console.log(`PASS TRACKED: ${passer.team} ${passer.role} #${passer.id} passed but no receiver found`);
      }
    }
  }, [tournamentMode]);

  // Check if a goal was scored
  const checkGoal = React.useCallback((position: Position): 'red' | 'blue' | null => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;

    // Add more detailed logging for goal detection (limited in tournament mode)
    if (position.x <= BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      if (!tournamentMode) {
        console.log("GOAL DETECTED: Blue team scored!", { position, goalTop, goalBottom });
      }
      return 'blue';
    }
    
    if (position.x >= PITCH_WIDTH - BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      if (!tournamentMode) {
        console.log("GOAL DETECTED: Red team scored!", { position, goalTop, goalBottom });
      }
      return 'red';
    }

    return null;
  }, [tournamentMode]);

  // Process goal scoring
  const processGoal = React.useCallback((scoringTeam: 'red' | 'blue') => {
    if (!tournamentMode) {
      console.log(`GOAL! Team ${scoringTeam} scored!`);
    }
    
    // Update score immediately
    setScore(prev => {
      const newScore = {
        ...prev,
        [scoringTeam]: prev[scoringTeam] + 1
      };
      if (!tournamentMode) {
        console.log(`New score: Red ${newScore.red} - Blue ${newScore.blue}`);
      }
      return newScore;
    });

    setPlayers(currentPlayers => {
      // Save ball position at the time of the goal for training
      const ballPositionAtGoal = {...ball.position};
      const ballPreviousPositionAtGoal = ball.previousPosition || {...ball.position};
      const ballVelocityAtGoal = ball.velocity || { x: 0, y: 0 };
      
      if (!tournamentMode) {
        console.log(`Ball position at goal: ${JSON.stringify(ballPositionAtGoal)}`);
      }
      
      // Determine if this was an own goal
      const isOwnGoal = lastPlayerTouchRef.current !== null && 
                        lastPlayerTouchRef.current.team !== scoringTeam;
      
      if (isOwnGoal && !tournamentMode) {
        console.log(`OWN GOAL detected! Last touch by ${lastPlayerTouchRef.current?.team} ${lastPlayerTouchRef.current?.role} #${lastPlayerTouchRef.current?.id}`);
      }
      
      // Update player brains
      const updatedPlayers = currentPlayers.map(player => {
        // Determine if this player was the last to touch the ball
        const isLastTouch = lastPlayerTouchRef.current?.id === player.id;
        
        // Check if the last touch was beneficial or harmful
        const lastTouchRelevant = lastPlayerTouchRef.current !== null;
        const wasLastTouchHelpful = lastTouchRelevant && 
          lastPlayerTouchRef.current.team === scoringTeam;
        const wasLastTouchHarmful = lastTouchRelevant && 
          lastPlayerTouchRef.current.team !== scoringTeam;
        
        // Save reference to the ball with position at the time of the goal for goalkeepers
        const ballAtGoal = {
          ...ball,
          position: ballPositionAtGoal,
          previousPosition: ballPreviousPositionAtGoal,
          velocity: ballVelocityAtGoal
        };
        
        // Get team context for this player
        const playerContext = getTeamContext(player);
        
        // Calculate additional tactical rewards
        let tacticalBonus = 0;
        if (player.brain.lastAction && 
            (player.team === scoringTeam && !isOwnGoal)) {
          try {
            // Add tactical bonus for players on scoring team
            const ballWithDetails = {
              position: ballPositionAtGoal,
              previousPosition: ballPreviousPositionAtGoal,
              velocity: ballVelocityAtGoal
            };
            
            tacticalBonus = calculateTacticalReward(
              player,
              ballWithDetails,
              playerContext,
              player.brain.lastAction as 'move' | 'pass' | 'shoot' | 'intercept'
            ) * 0.5; // Scale tactical bonus
            
            if (!tournamentMode && tacticalBonus > 0.2) {
              console.log(`${player.team} ${player.role} #${player.id} gets tactical bonus: ${tacticalBonus.toFixed(2)}`);
            }
          } catch (error) {
            console.error('Error calculating tactical bonus:', error);
          }
        }
        
        // Update brain with own goal information and tactical bonus
        const updatedBrain = updatePlayerBrain(
          player.brain,
          player.team === scoringTeam,
          ballAtGoal, // Use ball position at the time of the goal
          player,
          playerContext,
          (isLastTouch && (wasLastTouchHelpful || wasLastTouchHarmful)),
          isOwnGoal && player.team !== scoringTeam // Pass own goal flag to learning function
        );
        
        // Add tactical bonus to cumulative reward if applicable
        if (tacticalBonus > 0 && updatedBrain.cumulativeReward !== undefined) {
          updatedBrain.cumulativeReward += tacticalBonus;
        }
        
        return {
          ...player,
          brain: updatedBrain
        };
      });

      // In tournament mode, limit model saving to reduce memory usage
      if (!tournamentMode) {
        // After a goal, immediately save models of the scoring team
        updatedPlayers
          .filter(p => p.team === scoringTeam && p.role !== 'goalkeeper')
          .forEach(player => {
            saveModel(player)
              .catch(err => console.error(`Error saving model after goal:`, err));
          });

        // Special handling for own goals - ALWAYS save the model of the player who caused it
        if (lastPlayerTouchRef.current && lastPlayerTouchRef.current.team !== scoringTeam) {
          const lastTouchPlayer = updatedPlayers.find(p => p.id === lastPlayerTouchRef.current?.id);
          if (lastTouchPlayer) {
            // For own goals, always save with high priority
            saveModel(lastTouchPlayer)
              .catch(err => console.error(`Error saving model of last player (own goal):`, err));
              
            // Also save models of all players on the same team to discourage own goals team-wide
            updatedPlayers
              .filter(p => p.team === lastTouchPlayer.team && p.id !== lastTouchPlayer.id)
              .forEach(teammate => {
                if (Math.random() < 0.5) { // 50% chance to save teammates' models too
                  saveModel(teammate)
                    .catch(err => console.error(`Error saving teammate model after own goal:`, err));
                }
              });
          }
        }
        
        // Also save the model of the goalkeeper who conceded the goal
        const concedingTeam = scoringTeam === 'red' ? 'blue' : 'red';
        const goalkeeper = updatedPlayers.find(p => p.team === concedingTeam && p.role === 'goalkeeper');
        if (goalkeeper) {
          saveModel(goalkeeper)
            .catch(err => console.error(`Error saving goalkeeper model:`, err));
        }
      } else {
        // In tournament mode, save models selectively based on probability
        // to reduce API calls and memory pressure
        if (Math.random() < 0.1) { // Only ~10% chance to save models in tournament mode
          const keyPlayer = lastPlayerTouchRef.current || 
            updatedPlayers.find(p => p.team === scoringTeam && p.role === 'forward');
            
          if (keyPlayer) {
            saveModel(keyPlayer)
              .catch(err => console.error(`Error saving key player model in tournament:`, err));
          }
        }
      }

      // Reset the reference to the last player who touched the ball
      lastPlayerTouchRef.current = null;
      
      return updatedPlayers;
    });
  }, [ball, getTeamContext, setPlayers, setScore, lastPlayerTouchRef, tournamentMode]);

  return { checkGoal, processGoal, trackShotOnTarget, trackPassAttempt };
};
