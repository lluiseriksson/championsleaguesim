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
  
  const isPlayerCloseToTheBall = useCallback((player: Player): boolean => {
    const distance = calculateDistance(player.position, ball.position);
    return distance <= BALL_POSSESSION_THRESHOLD;
  }, [ball]);

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

  const handlePlayerShot = useCallback((player: Player, direction: Position): void => {
    let velocityX = direction.x * SHOOT_POWER;
    let velocityY = direction.y * SHOOT_POWER;
    
    velocityX += (Math.random() - 0.5) * 2;
    velocityY += (Math.random() - 0.5) * 2;
    
    setBall(prevBall => ({
      ...prevBall,
      velocity: { x: velocityX, y: velocityY },
      previousPosition: prevBall.position
    }));
    
    if (player.brain) {
      player.brain.lastAction = 'shoot';
      player.brain.lastOutput = { x: direction.x, y: direction.y };
      player.brain.lastShotDirection = direction;
    }
    
    if (onAction) {
      const targetGoalX = player.team === 'red' ? 800 : 0;
      const isSuccessful = (player.team === 'red' && direction.x > 0) || 
                          (player.team === 'blue' && direction.x < 0);
      
      onAction(player, 'shot', isSuccessful);
    }
    
    console.log(`${player.team} ${player.role} shot the ball`);
  }, [setBall, onAction]);

  const handlePlayerPass = useCallback((player: Player, direction: Position): void => {
    let velocityX = direction.x * PASS_POWER;
    let velocityY = direction.y * PASS_POWER;
    
    velocityX += (Math.random() - 0.5) * 1.2;
    velocityY += (Math.random() - 0.5) * 1.2;
    
    setBall(prevBall => ({
      ...prevBall,
      velocity: { x: velocityX, y: velocityY },
      previousPosition: prevBall.position
    }));
    
    if (player.brain) {
      player.brain.lastAction = 'pass';
      player.brain.lastOutput = { x: direction.x, y: direction.y };
    }
    
    if (onAction) {
      const isBackwardPass = (player.team === 'red' && direction.x < -0.5) || 
                            (player.team === 'blue' && direction.x > 0.5);
      const isSuccessful = !isBackwardPass;
      
      onAction(player, 'pass', isSuccessful);
    }
    
    console.log(`${player.team} ${player.role} passed the ball`);
  }, [setBall, onAction]);

  const handleBallInterception = useCallback((player: Player): void => {
    if (player.role === 'goalkeeper') {
      setBall(prevBall => ({
        ...prevBall,
        velocity: { x: 0, y: 0 },
        previousPosition: prevBall.position
      }));
      
      if (player.brain) {
        player.brain.lastAction = 'intercept';
        player.brain.lastOutput = { x: 0, y: 0 };
      }
      
      if (onAction) {
        onAction(player, 'intercept', true);
      }
      
      console.log(`${player.team} goalkeeper intercepted the ball`);
    }
  }, [setBall, onAction]);

  const updateBallPosition = useCallback(() => {
    setBall(prevBall => {
      const newBall = { 
        ...prevBall,
        previousPosition: { ...prevBall.position }
      };
      
      const playerWithBall = findClosestPlayer();
      
      if (playerWithBall) {
        if (onBallTouch) {
          onBallTouch(playerWithBall);
        }
        
        if (playerWithBall.role !== 'goalkeeper' && playerWithBall.brain && playerWithBall.brain.net) {
          try {
            if (isNetworkValid(playerWithBall.brain.net)) {
              const teammates = players.filter(p => p.team === playerWithBall.team && p.id !== playerWithBall.id);
              const opponents = players.filter(p => p.team !== playerWithBall.team);
              
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
              
              const inputs = calculateNetworkInputs(newBall, playerWithBall, teamContext);
              
              const output = playerWithBall.brain.net.run(inputs);
              
              if (output) {
                if (output.shootBall > 0.7) {
                  const direction = {
                    x: output.moveX * 2 - 1,
                    y: output.moveY * 2 - 1
                  };
                  
                  handlePlayerShot(playerWithBall, direction);
                }
                else if (output.passBall > 0.6) {
                  const direction = {
                    x: output.moveX * 2 - 1,
                    y: output.moveY * 2 - 1
                  };
                  
                  handlePlayerPass(playerWithBall, direction);
                }
                else if (output.intercept > 0.7 && playerWithBall.role === 'goalkeeper') {
                  handleBallInterception(playerWithBall);
                }
                else {
                  const actionThreshold = tournamentMode ? 0.03 : 0.05;
                  
                  if (Math.random() < actionThreshold) {
                    if (Math.random() < 0.3) {
                      const shootDirection = {
                        x: playerWithBall.team === 'red' ? 1 : -1,
                        y: (Math.random() - 0.5) * 0.8
                      };
                      
                      handlePlayerShot(playerWithBall, shootDirection);
                    } else {
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
          if (Math.random() < 0.1) {
            const passDirection = {
              x: playerWithBall.team === 'red' ? 0.8 : -0.8,
              y: (Math.random() - 0.5) * 1.5
            };
            
            handlePlayerPass(playerWithBall, passDirection);
          }
          else {
            handleBallInterception(playerWithBall);
          }
        }
        
        if (newBall.velocity.x === 0 && newBall.velocity.y === 0) {
          const offsetX = playerWithBall.team === 'red' ? 10 : -10;
          newBall.position = {
            x: playerWithBall.position.x + offsetX,
            y: playerWithBall.position.y
          };
        }
      }
      
      if (newBall.velocity.x !== 0 || newBall.velocity.y !== 0) {
        newBall.velocity = applyFriction(newBall.velocity, 0.98);
        newBall.velocity = applyBallAcceleration(newBall.velocity, newBall.position);
        
        const newPosition = {
          x: newBall.position.x + newBall.velocity.x,
          y: newBall.position.y + newBall.velocity.y
        };
        
        const scoringTeam = checkGoal(newPosition);
        if (scoringTeam !== null) {
          return newBall;
        }
        
        if (newPosition.x < BALL_RADIUS) {
          newPosition.x = BALL_RADIUS;
          newBall.velocity.x = -newBall.velocity.x * 0.8;
        } else if (newPosition.x > 800 - BALL_RADIUS) {
          newPosition.x = 800 - BALL_RADIUS;
          newBall.velocity.x = -newBall.velocity.x * 0.8;
        }
        
        if (newPosition.y < BALL_RADIUS) {
          newPosition.y = BALL_RADIUS;
          newBall.velocity.y = -newBall.velocity.y * 0.8;
        } else if (newPosition.y > 600 - BALL_RADIUS) {
          newPosition.y = 600 - BALL_RADIUS;
          newBall.velocity.y = -newBall.velocity.y * 0.8;
        }
        
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

export const useGoalkeeperReachAdjustment = () => {
  return {
    calculateEloGoalkeeperReachAdjustment: (elo: number) => {
      const baseReach = 0;
      const eloFactor = Math.max(0, (elo - 1500) / 1000);
      return baseReach + (eloFactor * 3);
    }
  };
};
