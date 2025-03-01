
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
}

// Return a hook with goal-related functions instead of a React component
export const useGoalSystem = ({ 
  setScore, 
  players, 
  setPlayers, 
  getTeamContext, 
  ball,
  lastPlayerTouchRef
}: GoalSystemProps) => {
  // Check if a goal was scored
  const checkGoal = React.useCallback((position: Position): 'red' | 'blue' | null => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;

    // Add more detailed logging for goal detection
    if (position.x <= BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      console.log("GOAL DETECTED: Blue team scored!", { position, goalTop, goalBottom });
      return 'blue';
    }
    
    if (position.x >= PITCH_WIDTH - BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      console.log("GOAL DETECTED: Red team scored!", { position, goalTop, goalBottom });
      return 'red';
    }

    return null;
  }, []);

  // Process goal scoring
  const processGoal = React.useCallback((scoringTeam: 'red' | 'blue') => {
    console.log(`GOAL! Team ${scoringTeam} scored!`); 
    
    // Update score immediately
    setScore(prev => {
      const newScore = {
        ...prev,
        [scoringTeam]: prev[scoringTeam] + 1
      };
      console.log(`New score: Red ${newScore.red} - Blue ${newScore.blue}`);
      return newScore;
    });

    setPlayers(currentPlayers => {
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
        
        return {
          ...player,
          brain: updatePlayerBrain(
            player.brain,
            player.team === scoringTeam,
            ball,
            player,
            getTeamContext(player),
            (isLastTouch && (wasLastTouchHelpful || wasLastTouchHarmful))
          )
        };
      });

      // After a goal, immediately save models of the scoring team
      updatedPlayers
        .filter(p => p.team === scoringTeam && p.role !== 'goalkeeper')
        .forEach(player => {
          saveModel(player)
            .catch(err => console.error(`Error saving model after goal:`, err));
        });

      // Also save the model of the last player who touched the ball if from the opposing team
      if (lastPlayerTouchRef.current && lastPlayerTouchRef.current.team !== scoringTeam) {
        const lastTouchPlayer = updatedPlayers.find(p => p.id === lastPlayerTouchRef.current?.id);
        if (lastTouchPlayer) {
          saveModel(lastTouchPlayer)
            .catch(err => console.error(`Error saving model of last player:`, err));
        }
      }

      // Reset the reference to the last player who touched the ball
      lastPlayerTouchRef.current = null;
      
      return updatedPlayers;
    });
  }, [ball, getTeamContext, setPlayers, setScore, lastPlayerTouchRef]);

  return { checkGoal, processGoal };
};
