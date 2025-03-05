
import React from 'react';
import { Position, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT, PITCH_WIDTH, Player, Ball } from '../../types/football';
import { Score } from '../../types/football';
import { updatePlayerBrain } from '../../utils/brainTraining';
import { saveModel } from '../../utils/neuralModelService';

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
        
        // Guardar referencia a la pelota con la posición en el momento del gol para los porteros
        const ballAtGoal = {
          ...ball,
          position: ballPositionAtGoal
        };
        
        // Update brain with own goal information
        return {
          ...player,
          brain: updatePlayerBrain(
            player.brain,
            player.team === scoringTeam,
            ballAtGoal, // Use ball position at the time of the goal
            player,
            getTeamContext(player),
            (isLastTouch && (wasLastTouchHelpful || wasLastTouchHarmful)),
            isOwnGoal && player.team !== scoringTeam // Pass own goal flag to learning function
          )
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
        
        // También guardar el modelo del portero que recibió el gol
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

  return { checkGoal, processGoal };
};
