import React from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { moveGoalkeeper } from '../../utils/playerBrain';
import { isOffside, getLastTeamTouchingBall } from '../../utils/offsideRules';

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
          
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.warn(`Invalid brain for ${player.team} ${player.role} #${player.id}, using fallback movement`);
            const dx = ball.position.x - player.position.x;
            const dy = ball.position.y - player.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = 1.5;
            const moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
            const moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
            
            let newPosition = {
              x: player.position.x + moveX,
              y: player.position.y + moveY
            };
            
            // Increased by 50% from base values
            let maxDistance = 75; // 50 * 1.5 = 75
            switch (player.role) {
              case 'defender': maxDistance = 105; break; // 70 * 1.5 = 105
              case 'midfielder': maxDistance = 150; break; // 100 * 1.5 = 150
              case 'forward': maxDistance = 180; break; // 120 * 1.5 = 180
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
            
            // Apply offside restriction for forwards
            if (positionRestricted && player.role === 'forward') {
              const defenders = currentPlayers.filter(p => p.team !== player.team && p.role === 'defender');
              const lastDefender = getLastDefenderPosition(defenders, player.team);
              
              if (lastDefender) {
                if ((player.team === 'red' && newPosition.x > lastDefender.x) || 
                    (player.team === 'blue' && newPosition.x < lastDefender.x)) {
                  // Keep the forward in line with the last defender
                  newPosition.x = lastDefender.x;
                }
              }
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
          
          // Using neural network for movement
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

          // Increased all distances by 50% from base values
          let maxDistance = 75; // 50 * 1.5 = 75
          const distanceToBall = Math.sqrt(
            Math.pow(ball.position.x - player.position.x, 2) +
            Math.pow(ball.position.y - player.position.y, 2)
          );

          switch (player.role) {
            case 'defender':
              maxDistance = distanceToBall < 150 ? 144 : 90; // 96 * 1.5 = 144, 60 * 1.5 = 90
              break;
            case 'midfielder':
              maxDistance = distanceToBall < 200 ? 180 : 120; // 120 * 1.5 = 180, 80 * 1.5 = 120
              break;
            case 'forward':
              maxDistance = distanceToBall < 250 ? 300 : 180; // 200 * 1.5 = 300, 120 * 1.5 = 180
              break;
          }

          let newPosition = {
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
          
          // Apply offside restriction for forwards
          if (positionRestricted && player.role === 'forward') {
            const defenders = currentPlayers.filter(p => p.team !== player.team && p.role === 'defender');
            const lastDefender = getLastDefenderPosition(defenders, player.team);
            
            if (lastDefender) {
              if ((player.team === 'red' && newPosition.x > lastDefender.x) || 
                  (player.team === 'blue' && newPosition.x < lastDefender.x)) {
                // Keep the forward in line with the last defender
                newPosition.x = lastDefender.x;
              }
            }
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
  }, [ball, gameReady, setPlayers, lastTeamTouchRef]);

  return { updatePlayerPositions };
};

// Helper function to get the last defender position
const getLastDefenderPosition = (defenders: Player[], opposingTeam: 'red' | 'blue') => {
  if (defenders.length === 0) return null;
  
  if (opposingTeam === 'red') {
    // Blue team is attacking, find the defender closest to blue's goal (left side)
    return defenders.reduce((prev, current) => 
      prev.position.x < current.position.x ? prev : current
    ).position;
  } else {
    // Red team is attacking, find the defender closest to red's goal (right side)
    return defenders.reduce((prev, current) => 
      prev.position.x > current.position.x ? prev : current
    ).position;
  }
};

export default usePlayerMovement;
