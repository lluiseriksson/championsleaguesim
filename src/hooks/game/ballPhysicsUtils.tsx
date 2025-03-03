import { Ball, Player, Position } from '../../types/football';
import { calculateDistance } from '../../utils/positionHelpers';
import { FRICTION } from '../../utils/ball/ballConstants';
import { handleBounceTracking, createInitialBounceDetection } from '../../utils/ball/bounceDetection';
import { handleWallCollisions, handleGoalPostCollision } from '../../utils/ball/collisionDetection';
import { 
  handleGoalkeeperBallInteractions, 
  handleFieldPlayerBallInteractions 
} from '../../utils/ball/playerInteraction';

export const handleBallPhysics = (
  currentBall: Ball,
  newPosition: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Ball => {
  // Apply friction
  const newVelocity = {
    x: currentBall.velocity.x * FRICTION,
    y: currentBall.velocity.y * FRICTION
  };

  // Initialize or propagate bounce detection state
  const bounceDetection = currentBall.bounceDetection || createInitialBounceDetection();

  // Handle wall and goal post collisions
  const { updatedPosition, updatedVelocity } = handleWallCollisions(
    newPosition, 
    newVelocity, 
    6, // ball radius
    bounceDetection,
    handleBounceTracking
  );
  
  // Check and handle goal post collisions
  let finalVelocity = handleGoalPostCollision(updatedPosition, updatedVelocity, 6);
  
  // Handle player collisions
  const currentTime = Date.now();
  let sideEffect = false;
  
  // First check goalkeepers for ball collision with priority
  for (const goalkeeper of goalkeepers) {
    const interaction = handleGoalkeeperBallInteractions(
      goalkeeper,
      updatedPosition,
      finalVelocity,
      currentTime,
      lastCollisionTimeRef,
      onBallTouch
    );
    
    if (interaction) {
      finalVelocity = interaction.updatedVelocity;
      sideEffect = interaction.sideEffect;
      break;
    }
  }
  
  // Then check field players if no goalkeeper interaction
  if (!sideEffect) {
    for (const player of fieldPlayers) {
      const interaction = handleFieldPlayerBallInteractions(
        player,
        updatedPosition,
        finalVelocity,
        currentTime,
        lastCollisionTimeRef,
        lastKickPositionRef,
        onBallTouch
      );
      
      if (interaction) {
        finalVelocity = interaction.updatedVelocity;
        sideEffect = interaction.sideEffect;
        break;
      }
    }
  }

  // Reset side effect flag if velocity is low
  if (Math.abs(finalVelocity.x) < 0.2 && Math.abs(finalVelocity.y) < 0.2) {
    bounceDetection.sideEffect = false;
  } else if (sideEffect) {
    bounceDetection.sideEffect = true;
  }

  return {
    position: updatedPosition,
    velocity: finalVelocity,
    bounceDetection
  };
};
