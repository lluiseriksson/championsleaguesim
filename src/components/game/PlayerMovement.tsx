
import React from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { moveGoalkeeper } from '../../utils/playerBrain';

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
  const updatePlayerPositions = React.useCallback(() => {
    if (!gameReady) return;
    
    setPlayers(currentPlayers => 
      currentPlayers.map(player => {
        try {
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
          
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.warn(`Invalid brain for ${player.team} ${player.role} #${player.id}, using fallback movement`);
            const dx = ball.position.x - player.position.x;
            const dy = ball.position.y - player.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = 1.5;
            const moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
            const moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
            
            const newPosition = {
              x: player.position.x + moveX,
              y: player.position.y + moveY
            };
            
            // Increased by 20% from base values
            let maxDistance = 60; // 50 * 1.2 = 60
            switch (player.role) {
              case 'defender': maxDistance = 84; break; // 70 * 1.2 = 84
              case 'midfielder': maxDistance = 120; break; // 100 * 1.2 = 120
              case 'forward': maxDistance = 144; break; // 120 * 1.2 = 144
            }
            
            const distanceFromStart = Math.sqrt(
              Math.pow(newPosition.x - player.targetPosition.x, 2) +
              Math.pow(newPosition.y - player.targetPosition.y, 2)
            );
            
            if (distanceFromStart > maxDistance) {
              const angle = Math.atan2(
                player.targetPosition.y - newPosition.y,
                player.targetPosition.x - newPosition.x
              );
              newPosition.x = player.targetPosition.x - Math.cos(angle) * maxDistance;
              newPosition.y = player.targetPosition.y - Math.sin(angle) * maxDistance;
            }
            
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            
            return {
              ...player,
              position: newPosition,
              brain: {
                ...player.brain,
                lastOutput: { x: moveX, y: moveY },
                lastAction: 'move'
              }
            };
          }
          
          const input = {
            ballX: ball.position.x / PITCH_WIDTH,
            ballY: ball.position.y / PITCH_HEIGHT,
            playerX: player.position.x / PITCH_WIDTH,
            playerY: player.position.y / PITCH_HEIGHT,
            ballVelocityX: ball.velocity.x / 20,
            ballVelocityY: ball.velocity.y / 20,
            distanceToGoal: 0.5,
            angleToGoal: 0,
            nearestTeammateDistance: 0.5,
            nearestTeammateAngle: 0,
            nearestOpponentDistance: 0.5,
            nearestOpponentAngle: 0,
            isInShootingRange: 0,
            isInPassingRange: 0,
            isDefendingRequired: 0
          };

          const output = player.brain.net.run(input);
          const moveX = (output.moveX || 0.5) * 2 - 1;
          const moveY = (output.moveY || 0.5) * 2 - 1;
          
          player.brain.lastOutput = { x: moveX, y: moveY };

          // Increased all distances by 20% from base values
          let maxDistance = 60; // 50 * 1.2 = 60
          const distanceToBall = Math.sqrt(
            Math.pow(ball.position.x - player.position.x, 2) +
            Math.pow(ball.position.y - player.position.y, 2)
          );

          switch (player.role) {
            case 'defender':
              maxDistance = distanceToBall < 150 ? 115.2 : 72; // 96 * 1.2 = 115.2, 60 * 1.2 = 72
              break;
            case 'midfielder':
              maxDistance = distanceToBall < 200 ? 144 : 96; // 120 * 1.2 = 144, 80 * 1.2 = 96
              break;
            case 'forward':
              maxDistance = distanceToBall < 250 ? 240 : 144; // 200 * 1.2 = 240, 120 * 1.2 = 144
              break;
          }

          const newPosition = {
            x: player.position.x + moveX * 2,
            y: player.position.y + moveY * 2,
          };

          const distanceFromStart = Math.sqrt(
            Math.pow(newPosition.x - player.targetPosition.x, 2) +
            Math.pow(newPosition.y - player.targetPosition.y, 2)
          );

          if (distanceFromStart > maxDistance) {
            const angle = Math.atan2(
              player.targetPosition.y - newPosition.y,
              player.targetPosition.x - newPosition.x
            );
            newPosition.x = player.targetPosition.x + Math.cos(angle) * maxDistance;
            newPosition.y = player.targetPosition.y + Math.sin(angle) * maxDistance;
          }

          newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
          newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));

          return {
            ...player,
            position: newPosition,
          };
        } catch (error) {
          console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
          return player;
        }
      })
    );
  }, [ball, gameReady, setPlayers]);

  return { updatePlayerPositions };
};

export default usePlayerMovement;
