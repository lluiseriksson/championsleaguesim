import React, { useEffect, useState, useRef } from 'react';
import TournamentBracket from '../components/TournamentBracket';
import TournamentHeader from '../components/tournament/TournamentHeader';
import TournamentControls from '../components/tournament/TournamentControls';
import ActiveMatch from '../components/tournament/ActiveMatch';
import { useTournament } from '../components/tournament/useTournament';
import { toast } from 'sonner';
import { cleanupModelCache } from '../utils/modelLoader';

interface TournamentProps {
  embeddedMode?: boolean;
}

const Tournament: React.FC<TournamentProps> = ({ embeddedMode = false }) => {
  const [isSimulationStuck, setIsSimulationStuck] = useState(false);
  const recoveryAttemptsRef = useRef(0);
  const lastProgressTimeRef = useRef(Date.now());
  const automaticRecoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track when component was mounted to help with error recovery
  const mountTimeRef = useRef(Date.now());
  const [memoryManagementActive, setMemoryManagementActive] = useState(false);
  
  const {
    matches,
    currentRound,
    activeMatch,
    playingMatch,
    autoSimulation,
    simulationPaused,
    resetTournament,
    playMatch,
    simulateSingleMatch,
    handleMatchComplete,
    startAutoSimulation,
    randomizeCurrentRound,
    getWinner,
    setActiveMatch,
    setPlayingMatch,
    setCurrentRound,
    setAutoSimulation,
    matchesPlayed
  } = useTournament(embeddedMode);

  // Set up automatic memory management
  useEffect(() => {
    if (!memoryManagementActive) {
      setMemoryManagementActive(true);
      console.log("Activating tournament memory management");
      
      // Periodically clean up model cache
      const cacheCleanupInterval = setInterval(() => {
        try {
          const cleanedCount = cleanupModelCache();
          if (cleanedCount > 0) {
            console.log(`Tournament memory management: Cleaned ${cleanedCount} cached models`);
          }
        } catch (error) {
          console.error("Error in cache cleanup:", error);
        }
      }, 60000); // Every minute
      
      return () => {
        clearInterval(cacheCleanupInterval);
        setMemoryManagementActive(false);
      };
    }
  }, [memoryManagementActive]);

  // Keep track of tournament progress to detect if it's stuck
  useEffect(() => {
    if (autoSimulation && !simulationPaused) {
      lastProgressTimeRef.current = Date.now();
      recoveryAttemptsRef.current = 0;
    }
  }, [matchesPlayed, currentRound, autoSimulation, simulationPaused]);

  // Check if current round is complete and needs to advance - only when not in auto mode
  useEffect(() => {
    if (!playingMatch && !autoSimulation) {
      const currentRoundMatches = matches.filter(m => m.round === currentRound);
      const allRoundMatchesPlayed = currentRoundMatches.length > 0 && 
                                   currentRoundMatches.every(m => m.played);

      if (allRoundMatchesPlayed && currentRound < 7) {
        const nextRound = currentRound + 1;
        const roundNames = ["", "Round of 128", "Round of 64", "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
        
        toast.success(`${roundNames[currentRound]} complete!`, {
          description: `Advancing to ${roundNames[nextRound]}`
        });
        
        setCurrentRound(nextRound);
      }
    }
  }, [matches, currentRound, playingMatch, autoSimulation, setCurrentRound]);

  // Comprehensive stuck simulation detection and recovery - only try recovery if not currently playing a match
  useEffect(() => {
    if (!autoSimulation || simulationPaused || playingMatch) {
      // Clear any existing auto-recovery timer
      if (automaticRecoveryTimerRef.current) {
        clearTimeout(automaticRecoveryTimerRef.current);
        automaticRecoveryTimerRef.current = null;
      }
      return;
    }
    
    const stuckCheckInterval = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastProgress = currentTime - lastProgressTimeRef.current;
      
      // If no progress for 5 seconds, try recovery steps
      if (timeSinceLastProgress > 5000 && !playingMatch) {
        console.log(`Simulation appears stuck for ${timeSinceLastProgress}ms, attempting recovery...`);
        setIsSimulationStuck(true);
        
        // Try different recovery strategies based on number of previous attempts
        if (recoveryAttemptsRef.current < 3) {
          // First try: Find next match and force play
          const nextMatch = matches.find(m => 
            m.round === currentRound && !m.played && m.teamA && m.teamB
          );
          
          if (nextMatch) {
            console.log("Recovery attempt: Force playing next available match");
            lastProgressTimeRef.current = currentTime;
            
            // Wait a short time before trying to simulate again
            // to allow any in-progress operations to complete
            if (automaticRecoveryTimerRef.current) {
              clearTimeout(automaticRecoveryTimerRef.current);
            }
            
            automaticRecoveryTimerRef.current = setTimeout(() => {
              if (!playingMatch) {
                try {
                  if (embeddedMode) {
                    simulateSingleMatch(nextMatch);
                  } else {
                    playMatch(nextMatch);
                  }
                } catch (error) {
                  console.error("Error in recovery attempt:", error);
                }
              }
              automaticRecoveryTimerRef.current = null;
            }, 800);
          } else {
            // If no matches left in round, try advancing round
            console.log("No pending matches found - trying to advance round");
            
            if (currentRound < 7) {
              const allRoundMatchesPlayed = matches
                .filter(m => m.round === currentRound)
                .every(m => m.played);
                
              if (allRoundMatchesPlayed) {
                console.log(`Advancing from stuck round ${currentRound} to ${currentRound + 1}`);
                setCurrentRound(currentRound + 1);
                lastProgressTimeRef.current = currentTime;
              }
            }
          }
        } else if (recoveryAttemptsRef.current < 5) {
          // Try to find and play the next match with a different approach
          const nextMatch = matches.find(m => 
            m.round === currentRound && !m.played && m.teamA && m.teamB
          );
          
          if (nextMatch && !playingMatch) {
            console.log("Recovery attempt: Force playing next available match with delay");
            lastProgressTimeRef.current = currentTime;
            
            // Use a longer delay for this recovery attempt
            if (automaticRecoveryTimerRef.current) {
              clearTimeout(automaticRecoveryTimerRef.current);
            }
            
            automaticRecoveryTimerRef.current = setTimeout(() => {
              if (!playingMatch) {
                try {
                  simulateSingleMatch(nextMatch);
                } catch (error) {
                  console.error("Error in recovery attempt:", error);
                }
              }
              automaticRecoveryTimerRef.current = null;
            }, 1500);
          }
        } else {
          // Last resort: restart auto simulation
          console.log("Recovery attempt: Restarting auto simulation");
          setAutoSimulation(false);
          
          if (automaticRecoveryTimerRef.current) {
            clearTimeout(automaticRecoveryTimerRef.current);
          }
          
          automaticRecoveryTimerRef.current = setTimeout(() => {
            // Make sure we're not in the middle of playing a match
            if (!playingMatch) {
              try {
                startAutoSimulation();
                lastProgressTimeRef.current = currentTime;
              } catch (error) {
                console.error("Error restarting auto simulation:", error);
              }
            }
            automaticRecoveryTimerRef.current = null;
          }, 2000);
        }
        
        recoveryAttemptsRef.current++;
        
        // If too many recovery attempts, stop auto simulation
        if (recoveryAttemptsRef.current > 8) {
          console.log("Too many recovery attempts - stopping auto simulation");
          setAutoSimulation(false);
          toast.error("Tournament simulation stopped", {
            description: "The simulation appears to be stuck. Try resuming manually."
          });
          
          // Force full reset if the component has been mounted for a while
          const componentUptime = currentTime - mountTimeRef.current;
          if (componentUptime > 5 * 60 * 1000) { // 5 minutes
            console.log("Long-running tournament detected. Performing cleanup...");
            cleanupModelCache();
          }
        }
        
        setIsSimulationStuck(false);
      }
    }, 1000); // Check every second
    
    return () => {
      clearInterval(stuckCheckInterval);
      if (automaticRecoveryTimerRef.current) {
        clearTimeout(automaticRecoveryTimerRef.current);
        automaticRecoveryTimerRef.current = null;
      }
    };
  }, [
    autoSimulation, 
    simulationPaused, 
    currentRound, 
    matches, 
    embeddedMode, 
    simulateSingleMatch, 
    playMatch, 
    setCurrentRound, 
    randomizeCurrentRound, 
    setAutoSimulation, 
    startAutoSimulation,
    playingMatch
  ]);

  // Clean up resources when unmounting
  useEffect(() => {
    return () => {
      console.log("Tournament component unmounting, cleaning up resources");
      cleanupModelCache();
      
      // Ensure timers are cleared
      if (automaticRecoveryTimerRef.current) {
        clearTimeout(automaticRecoveryTimerRef.current);
        automaticRecoveryTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="mx-auto px-0 py-2 max-w-full">
      <div className="text-left pl-1">
        <TournamentHeader 
          currentRound={currentRound}
          getWinner={getWinner}
        />
      
        <div className="mb-2 flex items-center justify-between">
          <TournamentControls
            currentRound={currentRound}
            autoSimulation={autoSimulation}
            simulationPaused={simulationPaused}
            resetTournament={resetTournament}
            startAutoSimulation={startAutoSimulation}
            randomizeRound={randomizeCurrentRound}
          />
        </div>
      </div>
      
      {playingMatch && activeMatch && activeMatch.teamA && activeMatch.teamB && !embeddedMode ? (
        <ActiveMatch
          activeMatch={activeMatch}
          onBackClick={() => {
            setActiveMatch(null);
            setPlayingMatch(false);
          }}
          onMatchComplete={handleMatchComplete}
        />
      ) : null}
      
      <div className="overflow-x-auto">
        <TournamentBracket 
          matches={matches} 
          onMatchClick={(match) => {
            if (!autoSimulation && match.teamA && match.teamB && !match.played) {
              if (embeddedMode) {
                simulateSingleMatch(match);
              } else {
                playMatch(match);
              }
            }
          }}
          showFullBracket={true}
        />
      </div>
    </div>
  );
};

export default Tournament;
