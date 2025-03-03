import React from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { moveGoalkeeper } from '../../utils/playerBrain';
import { isOffside, getLastTeamTouchingBall } from '../../utils/offsideRules';
import { getFallbackMovement } from '../../utils/fallbackMovement';
import { getNeuralMovement } from '../../utils/neuralMovement';

interface PlayerMovementProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  gameReady: boolean;
}

// Changed from React.FC to a custom hook
const usePlayerMovement = ({ 
  players, 
  setPlayers, 
  ball, 
  gameReady 
}: PlayerMovementProps) => {
  // Track which team last touched the ball
  const lastTeamTouchRef = React.useRef<'red' | 'blue' | null>(null);

  // Update last team touching the ball
  React.useEffect(() => {
    const playerTouchingBall = getLastTeamTouchingBall(players, ball);
    if (playerTouchingBall) {
      lastTeamTouchRef.current = playerTouchingBall.team;
    }
  }, [ball.position, players]);

  const updatePlayerPositions = React.useCallback(() => {
    if (!gameReady) return;
    
    setPlayers(currentPlayers => 
      currentPlayers.map(player => {
        try {
          // Goalkeepers move freely
          if (player.role === 'goalkeeper') {
            const movement = moveGoalkeeper(player, ball);
            const newPosition = {
              x: player.position.x + movement.x,
              y: player.position.y + movement.y
            };
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            return {
              ...player,
              position: newPosition,
              brain: {
                ...player.brain,
                lastOutput: movement,
                lastAction: 'move'
              }
            };
          }
          
          // Check for offside only for forwards
          let positionRestricted = false;
          if (player.role === 'forward') {
            positionRestricted = isOffside(player, currentPlayers, lastTeamTouchRef.current);
          }
          
          // Determine movement based on presence of neural network
          let movement;
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.warn(`Invalid brain for ${player.team} ${player.role} #${player.id}, using fallback movement`);
            movement = getFallbackMovement(player, ball, currentPlayers, positionRestricted);
          } else {
            movement = getNeuralMovement(player, ball, currentPlayers, positionRestricted);
          }
          
          return {
            ...player,
            position: movement.position,
            brain: {
              ...player.brain,
              lastOutput: movement.output,
              lastAction: 'move'
            }
          };
        } catch (error) {
          console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
          return player;
        }
      })
    );
  }, [ball, gameReady, setPlayers, lastTeamTouchRef]);

  return { updatePlayerPositions };
};

export default usePlayerMovement;
