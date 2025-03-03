
import React from 'react';
import { Position, Player } from '../../../types/football';
import { checkOffside } from '../../../utils/gamePhysics';
import { toast } from 'sonner';

interface OffsideHandlerProps {
  setBall: React.Dispatch<React.SetStateAction<any>>;
}

export function useOffsideHandler({ setBall }: OffsideHandlerProps) {
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

  // Check if there are players in offside position
  const checkOffsidePosition = React.useCallback((player: Player, players: Player[], ballPosition: Position) => {
    // Skip offside checks during active offside situation
    if (offsideDetectedRef.current) {
      return false;
    }

    // After a touch, check if there are players in offside position who might receive the ball
    for (const potentialReceiver of players) {
      // Only check players on the same team as the passer
      if (potentialReceiver.id !== player.id && potentialReceiver.team === player.team) {
        // Calculate distance to ball
        const dx = potentialReceiver.position.x - ballPosition.x;
        const dy = potentialReceiver.position.y - ballPosition.y;
        const distToBall = Math.sqrt(dx*dx + dy*dy);
        
        // If player is close to the ball (potential receiver) and in offside position
        if (distToBall < 40 && checkOffside(potentialReceiver, players, ballPosition, player.team)) {
          console.log(`Offside detected! Player ${potentialReceiver.id} of team ${potentialReceiver.team}`);
          
          // Execute offside free kick
          executeOffisideFreeKick(player.team, ballPosition);
          return true;
        }
      }
    }
    return false;
  }, [executeOffisideFreeKick]);

  return {
    offsideDetectedRef,
    freeKickInProgressRef,
    freeKickTeamRef,
    freeKickPositionRef,
    freeKickTimeoutRef,
    executeOffisideFreeKick,
    checkOffsidePosition
  };
}
