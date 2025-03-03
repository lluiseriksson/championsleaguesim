import React from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS } from '../../types/football';
import { handleBallPhysics } from './ballPhysicsUtils';
import { checkOffside } from '../../utils/gamePhysics';
import { toast } from 'sonner';

interface BallMovementProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch 
}: BallMovementProps) => {
  // Memoize player categorization
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  // Track last collision time to prevent multiple collisions in a short time
  const lastCollisionTimeRef = React.useRef(0);
  
  // Track the last position the ball was kicked from to prevent "stuck" situations
  const lastKickPositionRef = React.useRef<Position | null>(null);
  
  // Track time without movement to add a random kick if needed
  const noMovementTimeRef = React.useRef(0);
  const lastPositionRef = React.useRef<Position | null>(null);
  
  // Track last team to touch the ball
  const lastTouchTeamRef = React.useRef<'red' | 'blue' | null>(null);
  
  // Track offside state
  const offsideDetectedRef = React.useRef(false);
  const freeKickInProgressRef = React.useRef(false);
  const freeKickTeamRef = React.useRef<'red' | 'blue' | null>(null);
  const freeKickPositionRef = React.useRef<Position | null>(null);
  const freeKickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle free kick execution
  const executeOffisideFreeKick = React.useCallback((offendingTeam: 'red' | 'blue', position: Position) => {
    // The team that gets the free kick is the opposite team
    const freeKickTeam = offendingTeam === 'red' ? 'blue' : 'red';
    freeKickTeamRef.current = freeKickTeam;
    freeKickPositionRef.current = {...position};
    freeKickInProgressRef.current = true;
    offsideDetectedRef.current = true;
    
    // Show offside notification
    toast(`¡FUERA DE JUEGO!`, {
      description: `Falta para el equipo ${freeKickTeam === 'red' ? 'rojo' : 'azul'}`,
      position: "top-center",
    });
    
    // Position the ball for the free kick
    setBall(currentBall => ({
      ...currentBall,
      position: {...position},
      velocity: { x: 0, y: 0 } // Stop the ball for the free kick
    }));
    
    // Set a timeout to auto-execute the free kick after a delay if no player kicks it
    if (freeKickTimeoutRef.current) {
      clearTimeout(freeKickTimeoutRef.current);
    }
    
    freeKickTimeoutRef.current = setTimeout(() => {
      if (freeKickInProgressRef.current) {
        console.log("Auto-executing free kick after timeout");
        
        // Determine kick direction based on free kick team
        const kickDirection = freeKickTeam === 'red' ? 1 : -1;
        
        setBall(currentBall => ({
          ...currentBall,
          velocity: {
            x: kickDirection * 8, // Strong kick in team's attacking direction
            y: (Math.random() - 0.5) * 3 // Slight random vertical component
          }
        }));
        
        // End free kick state
        freeKickInProgressRef.current = false;
        
        // Reset offside after additional delay
        setTimeout(() => {
          offsideDetectedRef.current = false;
        }, 500);
      }
    }, 3000); // Auto-execute after 3 seconds
    
    return freeKickTeam;
  }, [setBall]);

  const updateBallPosition = React.useCallback(() => {
    // If a free kick is in progress, only allow the correct team to move the ball
    if (freeKickInProgressRef.current) {
      setBall(currentBall => {
        // Keep the ball stationary during free kick setup
        return {
          ...currentBall,
          position: freeKickPositionRef.current || currentBall.position,
          velocity: { x: 0, y: 0 }
        };
      });
      return;
    }
    
    setBall(currentBall => {
      // Check current ball speed
      const currentSpeed = Math.sqrt(
        currentBall.velocity.x * currentBall.velocity.x + 
        currentBall.velocity.y * currentBall.velocity.y
      );
      
      // Detect if ball is stuck in same position
      if (lastPositionRef.current) {
        const dx = currentBall.position.x - lastPositionRef.current.x;
        const dy = currentBall.position.y - lastPositionRef.current.y;
        const positionDelta = Math.sqrt(dx * dx + dy * dy);
        
        if (positionDelta < 0.1) {
          noMovementTimeRef.current += 1;
          
          // If ball hasn't moved for a while, give it a random kick
          if (noMovementTimeRef.current > 20) {
            console.log("Ball stuck in place, giving it a random kick");
            noMovementTimeRef.current = 0;
            
            // Random direction but not completely random
            return {
              ...currentBall,
              position: currentBall.position,
              velocity: {
                x: (Math.random() * 6) - 3,
                y: (Math.random() * 6) - 3
              }
            };
          }
        } else {
          // Reset counter if the ball is moving
          noMovementTimeRef.current = 0;
        }
      }
      
      // Update last position reference
      lastPositionRef.current = { ...currentBall.position };
      
      // If ball has zero velocity (should only happen at game start/reset),
      // give it a small push in a random direction
      if (currentSpeed === 0) {
        console.log("Ball has zero velocity, giving it an initial push");
        return {
          ...currentBall,
          position: currentBall.position,
          velocity: {
            x: (Math.random() * 6) - 3,
            y: (Math.random() * 6) - 3
          }
        };
      }
      
      // Calculate new position based on current velocity
      const newPosition = {
        x: currentBall.position.x + currentBall.velocity.x,
        y: currentBall.position.y + currentBall.velocity.y
      };

      // First check if a goal was scored
      const goalScored = checkGoal(newPosition);
      if (goalScored) {
        console.log(`Goal detected for team ${goalScored}`);
        // Reset offside state when a goal is scored
        offsideDetectedRef.current = false;
        if (freeKickTimeoutRef.current) {
          clearTimeout(freeKickTimeoutRef.current);
          freeKickTimeoutRef.current = null;
        }
        freeKickInProgressRef.current = false;
        
        // Reset ball position to center with a significant initial velocity
        return {
          ...currentBall,
          position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
          velocity: { 
            x: goalScored === 'red' ? 5 : -5, 
            y: (Math.random() - 0.5) * 5
          },
          bounceDetection: {
            consecutiveBounces: 0,
            lastBounceTime: 0,
            lastBounceSide: '',
            sideEffect: false
          }
        };
      }

      // Handle ball physics, with tracking of team touches and offside detection
      return handleBallPhysics(
        currentBall,
        newPosition,
        goalkeepers,
        fieldPlayers,
        (player) => {
          // If offside is currently active, only allow the correct team to touch the ball
          if (freeKickInProgressRef.current) {
            // If the touching player belongs to the team that gets the free kick, execute it
            if (player.team === freeKickTeamRef.current) {
              console.log(`Free kick being taken by ${player.team} player #${player.id}`);
              freeKickInProgressRef.current = false;
              
              // Clear any pending auto-execution
              if (freeKickTimeoutRef.current) {
                clearTimeout(freeKickTimeoutRef.current);
                freeKickTimeoutRef.current = null;
              }
              
              // Reset offside after a short delay
              setTimeout(() => {
                offsideDetectedRef.current = false;
              }, 500);
            } else {
              // If wrong team touches the ball during free kick, prevent it (by returning same ball)
              console.log(`Wrong team touched the ball during free kick! Player: ${player.team} #${player.id}`);
              return currentBall;
            }
          }
          
          // Skip offside checks during active offside situation
          if (offsideDetectedRef.current) {
            // Just register the touch and continue
            onBallTouch(player);
            return;
          }
          
          // Save the team that touched the ball
          lastTouchTeamRef.current = player.team;
          
          // After a touch, check if there are players in offside position who might receive the ball
          for (const potentialReceiver of players) {
            // Only check players on the same team as the passer
            if (potentialReceiver.id !== player.id && potentialReceiver.team === player.team) {
              // Calculate distance to ball
              const dx = potentialReceiver.position.x - currentBall.position.x;
              const dy = potentialReceiver.position.y - currentBall.position.y;
              const distToBall = Math.sqrt(dx*dx + dy*dy);
              
              // If player is close to the ball (potential receiver) and in offside position
              if (distToBall < 40 && checkOffside(potentialReceiver, players, currentBall.position, player.team)) {
                console.log(`Offside detected! Player ${potentialReceiver.id} of team ${potentialReceiver.team}`);
                
                // Execute offside free kick
                executeOffisideFreeKick(player.team, currentBall.position);
                return; // Ball position will be set by executeOffisideFreeKick
              }
            }
          }
          
          // If no offside, register the normal touch
          onBallTouch(player);
        },
        lastCollisionTimeRef,
        lastKickPositionRef
      );
    });
  }, [setBall, checkGoal, goalkeepers, fieldPlayers, onBallTouch, players, executeOffisideFreeKick]);

  return { updateBallPosition };
};
