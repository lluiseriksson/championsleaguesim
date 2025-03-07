import React from 'react';
import { Position, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT, PITCH_WIDTH, Player, Ball } from '../../types/football';
import { Score } from '../../types/football';
import { updatePlayerBrain } from '../../utils/brainTraining';
import { saveModel } from '../../utils/neuralModelService';
import { calculateTacticalReward } from '../../utils/experienceReplay';
import { calculateDistance } from '../../utils/neuralCore';
import { isShotLikelyOnTarget } from '../../utils/playerBrain';

interface GoalSystemProps {
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  getTeamContext: (player: Player) => any;
  ball: Ball;
  lastPlayerTouchRef: React.MutableRefObject<Player | null>;
  tournamentMode?: boolean;
  teamElos?: { red: number, blue: number };
}

// Return a hook with goal-related functions instead of a React component
export const useGoalSystem = ({ 
  setScore, 
  players, 
  setPlayers, 
  getTeamContext, 
  ball,
  lastPlayerTouchRef,
  tournamentMode = false,
  teamElos = { red: 2000, blue: 2000 }
}: GoalSystemProps) => {
  // Track the last player action for reward assignment
  const lastActionRef = React.useRef<{
    player: Player | null;
    action: 'shoot' | 'pass' | 'intercept' | 'move' | null;
    targetPlayer: Player | null;
    timestamp: number;
    shotQuality?: number;
  }>({
    player: null,
    action: null,
    targetPlayer: null,
    timestamp: 0,
    shotQuality: 0
  });
  
  // NEW: Track player contribution chain (last 3-5 players involved in build-up)
  const contributionChainRef = React.useRef<Array<{
    player: Player;
    action: 'shoot' | 'pass' | 'intercept' | 'move';
    timestamp: number;
  }>>([]);
  
  // Store the position where the goal was scored
  const goalScoringPositionRef = React.useRef<Position>({ x: 0, y: 0 });

  // NEW: Calculate shot quality for reward purposes
  const calculateShotQuality = React.useCallback((shooter: Player, shotVelocity: Position) => {
    // Get opponent goal
    const teamContext = getTeamContext(shooter);
    const opponentGoal = teamContext.opponentGoal;
    
    // Calculate base shot quality based on distance to goal
    const distanceToGoal = calculateDistance(shooter.position, opponentGoal);
    let shotQuality = Math.max(0.1, 1 - (distanceToGoal / 800));
    
    // Check if shot is on target
    const isOnTarget = isShotLikelyOnTarget(
      shooter.position, 
      shotVelocity, 
      opponentGoal, 
      GOAL_HEIGHT
    );
    
    // Shots on target get higher quality
    if (isOnTarget) {
      shotQuality *= 1.5;
    } else {
      shotQuality *= 0.3;
    }
    
    // Check for blockers in shot path
    let blockersInPath = 0;
    const opponentsNearby = teamContext.opponents.filter(opp => 
      calculateDistance(shooter.position, opp) < distanceToGoal
    );
    
    // Simple blocking calculation
    opponentsNearby.forEach(oppPos => {
      const angleToGoal = Math.atan2(
        opponentGoal.y - shooter.position.y,
        opponentGoal.x - shooter.position.x
      );
      
      const angleToOpp = Math.atan2(
        oppPos.y - shooter.position.y,
        oppPos.x - shooter.position.x
      );
      
      // If opponent is in roughly the same direction as the goal
      if (Math.abs(angleToGoal - angleToOpp) < Math.PI / 4) {
        blockersInPath++;
      }
    });
    
    // Reduce quality based on blockers
    shotQuality *= Math.max(0.2, 1 - (blockersInPath * 0.2));
    
    return Math.max(0, Math.min(1, shotQuality));
  }, [getTeamContext]);
  
  // Enhanced: Track shot attempt with quality assessment
  const trackShotOnTarget = React.useCallback((shooter: Player, shotVelocity: Position) => {
    // Calculate shot quality for reward later
    const shotQuality = calculateShotQuality(shooter, shotVelocity);
    
    // Record the shot attempt for reward calculation
    lastActionRef.current = {
      player: shooter,
      action: 'shoot',
      targetPlayer: null,
      timestamp: Date.now(),
      shotQuality
    };

    // Record shot direction and quality in player brain for reward calculation
    if (shooter.brain) {
      // Make sure we're adding the property safely
      shooter.brain.lastShotDirection = shotVelocity;
      
      // Initialize lastShotQuality if it doesn't exist
      if (shooter.brain.lastShotQuality === undefined) {
        shooter.brain.lastShotQuality = 0;
      }
      shooter.brain.lastShotQuality = shotQuality;
    }
    
    // Add shooter to contribution chain
    addToContributionChain(shooter, 'shoot');
    
    if (!tournamentMode) {
      console.log(`SHOT TRACKED: ${shooter.team} ${shooter.role} #${shooter.id} shot with velocity (${shotVelocity.x.toFixed(1)}, ${shotVelocity.y.toFixed(1)}), quality: ${shotQuality.toFixed(2)}`);
    }
  }, [tournamentMode, calculateShotQuality]);

  // Track pass attempts for reward purposes
  const trackPassAttempt = React.useCallback((passer: Player, targetPlayer: Player | null) => {
    lastActionRef.current = {
      player: passer,
      action: 'pass',
      targetPlayer,
      timestamp: Date.now()
    };
    
    // Update brain with pass outcome information
    if (passer.brain && targetPlayer) {
      passer.brain.lastPassOutcome = {
        success: targetPlayer.team === passer.team,
        targetId: targetPlayer.id
      };
    }
    
    // Add passer to contribution chain
    addToContributionChain(passer, 'pass');
    
    if (!tournamentMode) {
      if (targetPlayer) {
        console.log(`PASS TRACKED: ${passer.team} ${passer.role} #${passer.id} passed to ${targetPlayer.team} ${targetPlayer.role} #${targetPlayer.id}`);
      } else {
        console.log(`PASS TRACKED: ${passer.team} ${passer.role} #${passer.id} passed but no receiver found`);
      }
    }
  }, [tournamentMode]);
  
  // NEW: Add player to contribution chain
  const addToContributionChain = React.useCallback((player: Player, action: 'shoot' | 'pass' | 'intercept' | 'move') => {
    // Add to contribution chain - only add if this player isn't already the last one added
    const lastContribution = contributionChainRef.current[contributionChainRef.current.length - 1];
    if (!lastContribution || lastContribution.player.id !== player.id) {
      contributionChainRef.current.push({
        player,
        action,
        timestamp: Date.now()
      });
      
      // Keep only the last 5 contributions
      if (contributionChainRef.current.length > 5) {
        contributionChainRef.current.shift();
      }
    }
  }, []);

  // Check if a goal was scored
  const checkGoal = React.useCallback((position: Position): 'red' | 'blue' | null => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;

    // Add more detailed logging for goal detection (limited in tournament mode)
    if (position.x <= BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      // Store the position where the goal was scored
      goalScoringPositionRef.current = { ...position };
      
      if (!tournamentMode) {
        console.log("GOAL DETECTED: Blue team scored!", { position, goalTop, goalBottom });
      }
      return 'blue';
    }
    
    if (position.x >= PITCH_WIDTH - BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      // Store the position where the goal was scored
      goalScoringPositionRef.current = { ...position };
      
      if (!tournamentMode) {
        console.log("GOAL DETECTED: Red team scored!", { position, goalTop, goalBottom });
      }
      return 'red';
    }

    return null;
  }, [tournamentMode]);

  // NEW: Calculate contribution reward based on role and time elapsed since contribution
  const calculateContributionReward = React.useCallback((player: Player, contributionTime: number, action: string) => {
    const timeElapsed = Date.now() - contributionTime;
    const maxRewardTime = 5000; // 5 seconds
    
    // Time decay factor - contributions more than maxRewardTime ms ago get reduced reward
    const timeFactor = Math.max(0, 1 - (timeElapsed / maxRewardTime));
    
    // Role-based reward multipliers - midfielders and forwards get higher rewards
    let roleMultiplier = 1.0;
    if (player.role === 'midfielder') {
      roleMultiplier = 1.5; // Higher reward for midfielders
    } else if (player.role === 'forward') {
      roleMultiplier = 2.0; // Even higher reward for forwards
    }
    
    // Action-based reward multipliers
    let actionMultiplier = 1.0;
    if (action === 'pass') {
      actionMultiplier = 1.2; // Higher reward for passes
    } else if (action === 'shoot') {
      actionMultiplier = 1.5; // Even higher reward for shots
    }
    
    // Calculate final contribution reward
    const reward = timeFactor * roleMultiplier * actionMultiplier;
    
    if (!tournamentMode && reward > 0.2) {
      console.log(`${player.team} ${player.role} #${player.id} gets build-up contribution reward: ${reward.toFixed(2)}`);
    }
    
    return Math.max(0, reward);
  }, [tournamentMode]);

  // Process goal scoring
  const processGoal = React.useCallback((scoringTeam: 'red' | 'blue') => {
    if (!tournamentMode) {
      console.log(`GOAL! Team ${scoringTeam} scored!`);
    }
    
    // Update score immediately
    setScore(prev => {
      const newScore = {
        ...prev,
        [scoringTeam]: prev[scoringTeam] + 1
      };
      if (!tournamentMode) {
        console.log(`New score: Red ${newScore.red} - Blue ${newScore.blue}`);
      }
      return newScore;
    });

    setPlayers(currentPlayers => {
      // Save ball position at the time of the goal for training
      const ballPositionAtGoal = {...ball.position};
      const ballPreviousPositionAtGoal = ball.previousPosition || {...ball.position};
      const ballVelocityAtGoal = ball.velocity || { x: 0, y: 0 };
      
      // Use the stored goal scoring position
      const goalPosition = {...goalScoringPositionRef.current};
      
      if (!tournamentMode) {
        console.log(`Ball position at goal: ${JSON.stringify(ballPositionAtGoal)}`);
        console.log(`Goal scored at position: ${JSON.stringify(goalPosition)}`);
        
        // Log contribution chain for debugging
        console.log(`CONTRIBUTION CHAIN LENGTH: ${contributionChainRef.current.length}`);
        contributionChainRef.current.forEach((contrib, index) => {
          console.log(`${index+1}: ${contrib.player.team} ${contrib.player.role} #${contrib.player.id} - ${contrib.action}`);
        });
      }
      
      // Determine if this was an own goal
      const isOwnGoal = lastPlayerTouchRef.current !== null && 
                        lastPlayerTouchRef.current.team !== scoringTeam;
      
      if (isOwnGoal && !tournamentMode) {
        console.log(`OWN GOAL detected! Last touch by ${lastPlayerTouchRef.current?.team} ${lastPlayerTouchRef.current?.role} #${lastPlayerTouchRef.current?.id}`);
      }
      
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
        
        // Save reference to the ball with position at the time of the goal for goalkeepers
        const ballAtGoal = {
          ...ball,
          position: ballPositionAtGoal,
          previousPosition: ballPreviousPositionAtGoal,
          velocity: ballVelocityAtGoal
        };
        
        // Get team context for this player
        const playerContext = getTeamContext(player);
        
        // Get shot quality from last action if available
        let shotQuality = 0;
        if (lastActionRef.current.player?.id === player.id && 
            lastActionRef.current.action === 'shoot' &&
            lastActionRef.current.shotQuality !== undefined) {
          shotQuality = lastActionRef.current.shotQuality;
          
          if (!tournamentMode) {
            console.log(`Using tracked shot quality ${shotQuality.toFixed(2)} for ${player.team} ${player.role} #${player.id}`);
          }
        }
        
        // NEW: Check if player was part of contribution chain leading to goal
        let contributionReward = 0;
        if (player.team === scoringTeam && !isOwnGoal) {
          // Find all contributions from this player
          const playerContributions = contributionChainRef.current
            .filter(contrib => contrib.player.id === player.id);
          
          // Sum rewards from all contributions
          contributionReward = playerContributions.reduce((total, contrib) => {
            return total + calculateContributionReward(
              player, 
              contrib.timestamp, 
              contrib.action
            );
          }, 0);
          
          // Cap total contribution reward to prevent excessive values
          contributionReward = Math.min(contributionReward, 5.0);
        }
        
        // Calculate additional tactical rewards
        let tacticalBonus = 0;
        if (player.brain.lastAction && 
            (player.team === scoringTeam && !isOwnGoal)) {
          try {
            // Add tactical bonus for players on scoring team
            const ballWithDetails = {
              position: ballPositionAtGoal,
              previousPosition: ballPreviousPositionAtGoal,
              velocity: ballVelocityAtGoal
            };
            
            tacticalBonus = calculateTacticalReward(
              player,
              ballWithDetails,
              playerContext,
              player.brain.lastAction as 'move' | 'pass' | 'shoot' | 'intercept'
            ) * 0.5; // Scale tactical bonus
            
            if (!tournamentMode && tacticalBonus > 0.2) {
              console.log(`${player.team} ${player.role} #${player.id} gets tactical bonus: ${tacticalBonus.toFixed(2)}`);
            }
          } catch (error) {
            console.error('Error calculating tactical bonus:', error);
          }
        }
        
        // Add shot quality to the brain for goal/no goal learning
        if (player.brain) {
          // Initialize lastShotQuality if it doesn't exist
          if (player.brain.lastShotQuality === undefined) {
            player.brain.lastShotQuality = 0;
          }
          player.brain.lastShotQuality = shotQuality;
        }
        
        // Update brain with own goal information and tactical bonus
        const updatedBrain = updatePlayerBrain(
          player.brain,
          player.team === scoringTeam,
          ballAtGoal, // Use ball position at the time of the goal
          player,
          playerContext,
          (isLastTouch && (wasLastTouchHelpful || wasLastTouchHarmful)),
          isOwnGoal && player.team !== scoringTeam, // Pass own goal flag to learning function
          { contributionReward } // Pass contribution reward as part of game context
        );
        
        // Add tactical bonus to cumulative reward if applicable
        if (tacticalBonus > 0 && updatedBrain.cumulativeReward !== undefined) {
          updatedBrain.cumulativeReward += tacticalBonus;
        }
        
        // NEW: Add contribution bonus to cumulative reward if applicable
        if (contributionReward > 0 && updatedBrain.cumulativeReward !== undefined) {
          updatedBrain.cumulativeReward += contributionReward;
          if (!tournamentMode) {
            console.log(`${player.team} ${player.role} #${player.id} gets total contribution reward: ${contributionReward.toFixed(2)}`);
          }
        }
        
        return {
          ...player,
          brain: updatedBrain
        };
      });

      // In tournament mode, limit model saving to reduce memory usage
      if (!tournamentMode) {
        // After a goal, immediately save models of the scoring team
        updatedPlayers
          .filter(p => p.team === scoringTeam && p.role !== 'goalkeeper')
          .forEach(player => {
            saveModel(player)
              .catch(err => console.error(`Error saving model after goal:`, err));
          });

        // Special handling for own goals - ALWAYS save the model of the player who caused it
        if (lastPlayerTouchRef.current && lastPlayerTouchRef.current.team !== scoringTeam) {
          const lastTouchPlayer = updatedPlayers.find(p => p.id === lastPlayerTouchRef.current?.id);
          if (lastTouchPlayer) {
            // For own goals, always save with high priority
            saveModel(lastTouchPlayer)
              .catch(err => console.error(`Error saving model of last player (own goal):`, err));
              
            // Also save models of all players on the same team to discourage own goals team-wide
            updatedPlayers
              .filter(p => p.team === lastTouchPlayer.team && p.id !== lastTouchPlayer.id)
              .forEach(teammate => {
                if (Math.random() < 0.5) { // 50% chance to save teammates' models too
                  saveModel(teammate)
                    .catch(err => console.error(`Error saving teammate model after own goal:`, err));
                }
              });
          }
        }
        
        // Also save the model of the goalkeeper who conceded the goal
        const concedingTeam = scoringTeam === 'red' ? 'blue' : 'red';
        const goalkeeper = updatedPlayers.find(p => p.team === concedingTeam && p.role === 'goalkeeper');
        if (goalkeeper) {
          saveModel(goalkeeper)
            .catch(err => console.error(`Error saving goalkeeper model:`, err));
        }
      } else {
        // In tournament mode, save models selectively based on probability
        // to reduce API calls and memory pressure
        if (Math.random() < 0.1) { // Only ~10% chance to save models in tournament mode
          const keyPlayer = lastPlayerTouchRef.current || 
            updatedPlayers.find(p => p.team === scoringTeam && p.role === 'forward');
            
          if (keyPlayer) {
            saveModel(keyPlayer)
              .catch(err => console.error(`Error saving key player model in tournament:`, err));
          }
        }
      }

      // Reset the reference to the last player who touched the ball
      lastPlayerTouchRef.current = null;
      
      // Reset the goal scoring position
      goalScoringPositionRef.current = { x: 0, y: 0 };
      
      // Reset contribution chain after processing a goal
      contributionChainRef.current = [];
      
      return updatedPlayers;
    });
  }, [ball, getTeamContext, setPlayers, setScore, lastPlayerTouchRef, tournamentMode, calculateContributionReward]);

  return { checkGoal, processGoal, trackShotOnTarget, trackPassAttempt };
};
