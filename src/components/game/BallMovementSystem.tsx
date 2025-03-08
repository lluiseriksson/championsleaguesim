import { useCallback } from 'react';
import { Player, Ball, Position, PLAYER_RADIUS, BALL_RADIUS, SHOOT_POWER, PASS_POWER } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';
import { calculateNetworkInputs } from '../../utils/neuralInputs';
import { applyBallAcceleration, applyFriction } from '../../utils/gamePhysics';
import { isNetworkValid } from '../../utils/neuralHelpers';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch?: (player: Player) => void;
  tournamentMode?: boolean;
  onAction?: (player: Player, actionType: string, success: boolean) => void;
}

export const useGoalkeeperReachAdjustment = (
  goalkeeper: Player,
  allPlayers: Player[],
  isAngledShot: boolean
): number => {
  // This is a placeholder implementation for the goalkeeper reach adjustment
  // The real implementation would use ELO ratings to determine reach
  return 0;
};

export const useBallMovementSystem = ({
  ball,
  setBall,
  players,
  checkGoal,
  onBallTouch,
  tournamentMode = false,
  onAction
}: BallMovementSystemProps) => {
  const BALL_POSSESSION_THRESHOLD = PLAYER_RADIUS + BALL_RADIUS + 5;
  
  // Detect if ball is close to a player
  const isPlayerCloseToTheBall = useCallback((player: Player): boolean => {
    const distance = calculateDistance(player.position, ball.position);
    return distance <= BALL_POSSESSION_THRESHOLD;
  }, [ball]);

  // Check which player is closest to the ball
  const findClosestPlayer = useCallback((): Player | null => {
    let closestPlayer: Player | null = null;
    let minDistance = Number.MAX_VALUE;
    
    for (const player of players) {
      const distance = calculateDistance(player.position, ball.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestPlayer = player;
      }
    }
    
    return minDistance <= BALL_POSSESSION_THRESHOLD ? closestPlayer : null;
  }, [players, ball]);

  // Handle player shooting the ball
  const handlePlayerShot = useCallback((player: Player, direction: Position): void => {
    // Apply shot velocity to the ball
    let velocityX = direction.x * SHOOT_POWER;
    let velocityY = direction.y * SHOOT_POWER;
    
    // Add some randomness to the shot
    velocityX += (Math.random() - 0.5) * 2;
    velocityY += (Math.random() - 0.5) * 2;
    
    setBall(prevBall => ({
      ...prevBall,
      velocity: { x: velocityX, y: velocityY },
      previousPosition: prevBall.position
    }));
    
    // Track the shot for training purposes
    if (player.brain) {
      player.brain.lastAction = 'shoot';
      player.brain.lastOutput = { x: direction.x, y: direction.y };
      player.brain.lastShotDirection = direction;
    }
    
    // Call the onAction callback if provided
    if (onAction) {
      // Determine if the shot is successful based on general direction toward the opponent's goal
      const targetGoalX = player.team === 'red' ? 800 : 0;
      const isSuccessful = (player.team === 'red' && direction.x > 0) || 
                          (player.team === 'blue' && direction.x < 0);
      
      onAction(player, 'shot', isSuccessful);
    }
    
    console.log(`${player.team} ${player.role} shot the ball`);
  }, [setBall, onAction]);

  // Handle player passing the ball
  const handlePlayerPass = useCallback((player: Player, direction: Position): void => {
    // Apply pass velocity to the ball
    let velocityX = direction.x * PASS_POWER;
    let velocityY = direction.y * PASS_POWER;
    
    // Add minimal randomness to passes
    velocityX += (Math.random() - 0.5) * 1.2;
    velocityY += (Math.random() - 0.5) * 1.2;
    
    setBall(prevBall => ({
      ...prevBall,
      velocity: { x: velocityX, y: velocityY },
      previousPosition: prevBall.position
    }));
    
    // Track the pass for training purposes
    if (player.brain) {
      player.brain.lastAction = 'pass';
      player.brain.lastOutput = { x: direction.x, y: direction.y };
    }
    
    // Call the onAction callback if provided
    if (onAction) {
      // For now, consider a pass successful if it's not straight backward
      const isBackwardPass = (player.team === 'red' && direction.x < -0.5) || 
                            (player.team === 'blue' && direction.x > 0.5);
      const isSuccessful = !isBackwardPass;
      
      onAction(player, 'pass', isSuccessful);
    }
    
    console.log(`${player.team} ${player.role} passed the ball`);
  }, [setBall, onAction]);

  // Handle ball interception by goalkeeper
  const handleBallInterception = useCallback((player: Player): void => {
    if (player.role === 'goalkeeper') {
      // Stop the ball
      setBall(prevBall => ({
        ...prevBall,
        velocity: { x: 0, y: 0 },
        previousPosition: prevBall.position
      }));
      
      // Track the interception for training purposes
      if (player.brain) {
        player.brain.lastAction = 'intercept';
        player.brain.lastOutput = { x: 0, y: 0 };
      }
      
      // Call the onAction callback if provided
      if (onAction) {
        onAction(player, 'intercept', true);
      }
      
      console.log(`${player.team} goalkeeper intercepted the ball`);
    }
  }, [setBall, onAction]);

  // Main function to update ball position
  const updateBallPosition = useCallback(() => {
    // Always store previous position for physics calculations
    setBall(prevBall => {
      const newBall = { 
        ...prevBall,
        previousPosition: { ...prevBall.position }
      };
      
      // Check if any player is close to the ball
      const playerWithBall = findClosestPlayer();
      
      if (playerWithBall) {
        if (onBallTouch) {
          onBallTouch(playerWithBall);
        }
        
        // Only use the neural network for non-goalkeeper players
        if (playerWithBall.role !== 'goalkeeper' && playerWithBall.brain && playerWithBall.brain.net) {
          try {
            if (isNetworkValid(playerWithBall.brain.net)) {
              // Get teammates and opponents for context
              const teammates = players.filter(p => p.team === playerWithBall.team && p.id !== playerWithBall.id);
              const opponents = players.filter(p => p.team !== playerWithBall.team);
              
              // Create team context object for neural input
              const teamContext = {
                teammates: teammates.map(t => t.position),
                opponents: opponents.map(o => o.position),
                ownGoal: { 
                  x: playerWithBall.team === 'red' ? 0 : 800, 
                  y: 300 
                },
                opponentGoal: { 
                  x: playerWithBall.team === 'red' ? 800 : 0, 
                  y: 300 
                }
              };
              
              // Get neural network inputs based on game state
              const inputs = calculateNetworkInputs(newBall, playerWithBall, teamContext);
              
              // Run neural network to decide action
              const output = playerWithBall.brain.net.run(inputs);
              
              if (output) {
                // Decide whether to shoot, pass, or move based on neural network output
                if (output.shootBall > 0.7) {
                  // Neural network decided to shoot
                  const direction = {
                    x: output.moveX * 2 - 1,
                    y: output.moveY * 2 - 1
                  };
                  
                  handlePlayerShot(playerWithBall, direction);
                }
                else if (output.passBall > 0.6) {
                  // Neural network decided to pass
                  const direction = {
                    x: output.moveX * 2 - 1,
                    y: output.moveY * 2 - 1
                  };
                  
                  handlePlayerPass(playerWithBall, direction);
                }
                else if (output.intercept > 0.7 && playerWithBall.role === 'goalkeeper') {
                  // Goalkeeper decided to intercept the ball
                  handleBallInterception(playerWithBall);
                }
                else {
                  // Random chance for player to make a decision (lower in tournament mode)
                  const actionThreshold = tournamentMode ? 0.03 : 0.05;
                  
                  if (Math.random() < actionThreshold) {
                    if (Math.random() < 0.3) {
                      // Randomly decide to shoot
                      const shootDirection = {
                        x: playerWithBall.team === 'red' ? 1 : -1,
                        y: (Math.random() - 0.5) * 0.8
                      };
                      
                      handlePlayerShot(playerWithBall, shootDirection);
                    } else {
                      // Randomly decide to pass
                      const passDirection = {
                        x: (Math.random() * 2 - 1) * (playerWithBall.team === 'red' ? 0.8 : -0.8),
                        y: (Math.random() - 0.5) * 1.2
                      };
                      
                      handlePlayerPass(playerWithBall, passDirection);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error in neural network for ${playerWithBall.team} ${playerWithBall.role}:`, error);
          }
        }
        else if (playerWithBall.role === 'goalkeeper') {
          // Goalkeeper has special handling
          if (Math.random() < 0.1) {
            // Goalkeeper passes the ball out
            const passDirection = {
              x: playerWithBall.team === 'red' ? 0.8 : -0.8,
              y: (Math.random() - 0.5) * 1.5
            };
            
            handlePlayerPass(playerWithBall, passDirection);
          }
          else {
            // Goalkeeper intercepts/holds the ball
            handleBallInterception(playerWithBall);
          }
        }
        
        // Ball follows player position with slight offset
        if (newBall.velocity.x === 0 && newBall.velocity.y === 0) {
          const offsetX = playerWithBall.team === 'red' ? 10 : -10;
          newBall.position = {
            x: playerWithBall.position.x + offsetX,
            y: playerWithBall.position.y
          };
        }
      }
      
      // Apply physics if ball has velocity
      if (newBall.velocity.x !== 0 || newBall.velocity.y !== 0) {
        // Apply friction to slow down the ball
        newBall.velocity = applyFriction(newBall.velocity, 0.98);
        
        // Apply acceleration if needed
        newBall.velocity = applyBallAcceleration(newBall.velocity, newBall.position);
        
        // Update ball position based on velocity
        const newPosition = {
          x: newBall.position.x + newBall.velocity.x,
          y: newBall.position.y + newBall.velocity.y
        };
        
        // Check for goals before updating position
        const scoringTeam = checkGoal(newPosition);
        if (scoringTeam !== null) {
          // Don't update position since a goal was scored and ball will be reset
          return newBall;
        }
        
        // Check for boundary collisions
        // Left and right boundaries
        if (newPosition.x < BALL_RADIUS) {
          newPosition.x = BALL_RADIUS;
          newBall.velocity.x = -newBall.velocity.x * 0.8;
        } else if (newPosition.x > 800 - BALL_RADIUS) {
          newPosition.x = 800 - BALL_RADIUS;
          newBall.velocity.x = -newBall.velocity.x * 0.8;
        }
        
        // Top and bottom boundaries
        if (newPosition.y < BALL_RADIUS) {
          newPosition.y = BALL_RADIUS;
          newBall.velocity.y = -newBall.velocity.y * 0.8;
        } else if (newPosition.y > 600 - BALL_RADIUS) {
          newPosition.y = 600 - BALL_RADIUS;
          newBall.velocity.y = -newBall.velocity.y * 0.8;
        }
        
        // Update position
        newBall.position = newPosition;
      }
      
      return newBall;
    });
  }, [
    findClosestPlayer, 
    onBallTouch, 
    players, 
    checkGoal, 
    handlePlayerShot, 
    handlePlayerPass, 
    handleBallInterception,
    tournamentMode
  ]);

  return { updateBallPosition };
};
