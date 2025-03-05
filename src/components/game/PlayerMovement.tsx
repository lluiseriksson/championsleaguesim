
import { useCallback, useEffect, useRef } from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { calculateNetworkInputs } from '../../utils/playerBrain';
import { moveGoalkeeper } from '../../utils/goalkeeperLogic';

interface PlayerMovementProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  gameReady: boolean;
}

const usePlayerMovement = ({ players, setPlayers, ball, gameReady }: PlayerMovementProps) => {
  const playerSpeedRef = useRef<Record<number, number>>({});
  
  // Set initial speeds or update on players change
  useEffect(() => {
    const speeds: Record<number, number> = {};
    players.forEach(player => {
      // Base speed determined by position (goalkeepers are slower, forwards are faster)
      const baseSpeed = 
        player.role === 'goalkeeper' ? 2 : 
        player.role === 'defender' ? 2.5 :
        player.role === 'midfielder' ? 2.8 :
        3.2; // forwards are fastest
      
      // Apply the ELO-based speedMultiplier if available, otherwise default to 1
      const speedMultiplier = player.speedMultiplier || 1;
      
      speeds[player.id] = baseSpeed * speedMultiplier;
    });
    playerSpeedRef.current = speeds;
  }, [players]);

  // Main function to update all player positions
  const updatePlayerPositions = useCallback(() => {
    if (!gameReady || players.length === 0) return;
    
    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        // Move goalkeepers with simple logic
        if (player.role === 'goalkeeper') {
          return moveGoalkeeper(player, ball);
        }
        
        // Get context for this player's team
        const teammates = prevPlayers.filter(p => p.team === player.team && p.id !== player.id);
        const opponents = prevPlayers.filter(p => p.team !== player.team);
        
        const context = {
          teammates: teammates.map(p => p.position),
          opponents: opponents.map(p => p.position),
          ownGoal: player.team === 'red' ? { x: 0, y: 500/2 } : { x: 800, y: 500/2 },
          opponentGoal: player.team === 'red' ? { x: 800, y: 500/2 } : { x: 0, y: 500/2 }
        };
        
        // Calculate neural network inputs
        const inputs = calculateNetworkInputs(ball, player, context);
        
        // Only run the network if it exists
        if (player.brain.net) {
          try {
            // Run network to get movement output
            const output = player.brain.net.run(inputs);
            
            const moveX = (output.moveX * 2 - 1) * 10; // Scale to -10 to 10
            const moveY = (output.moveY * 2 - 1) * 10; // Scale to -10 to 10
            
            // Get player's current speed (with ELO bonus if applicable)
            const speed = playerSpeedRef.current[player.id] || 
                          (player.role === 'goalkeeper' ? 2 : 
                           player.role === 'defender' ? 2.5 : 
                           player.role === 'midfielder' ? 2.8 : 3.2);
            
            // Calculate new position with speed factored in
            const newX = Math.max(0, Math.min(PITCH_WIDTH, player.position.x + moveX * (speed/10)));
            const newY = Math.max(0, Math.min(PITCH_HEIGHT, player.position.y + moveY * (speed/10)));
            
            // Update the player's brain with the last output
            player.brain.lastOutput = { x: moveX, y: moveY };
            
            // Determine action based on output values
            if (output.shootBall > 0.7 && 
                Math.abs(player.position.x - ball.position.x) < 30 && 
                Math.abs(player.position.y - ball.position.y) < 30) {
              player.brain.lastAction = 'shoot';
            } else if (output.passBall > 0.7 && 
                       Math.abs(player.position.x - ball.position.x) < 30 && 
                       Math.abs(player.position.y - ball.position.y) < 30) {
              player.brain.lastAction = 'pass';
            } else if (output.intercept > 0.7) {
              player.brain.lastAction = 'intercept';
            } else {
              player.brain.lastAction = 'move';
            }
            
            // Return updated player with new position
            return { 
              ...player, 
              position: { x: newX, y: newY }
            };
          } catch (error) {
            console.error(`Error running neural network for player ${player.id}:`, error);
            // Return player unchanged if there's an error
            return player;
          }
        }
        
        // If no neural network exists, use simple follow-ball logic
        const dx = ball.position.x - player.position.x;
        const dy = ball.position.y - player.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
          const speed = playerSpeedRef.current[player.id] || 2;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;
          
          return {
            ...player,
            position: {
              x: Math.max(0, Math.min(PITCH_WIDTH, player.position.x + vx)),
              y: Math.max(0, Math.min(PITCH_HEIGHT, player.position.y + vy))
            }
          };
        }
        
        return player;
      });
    });
  }, [gameReady, players, ball, setPlayers]);

  return { updatePlayerPositions };
};

export default usePlayerMovement;
