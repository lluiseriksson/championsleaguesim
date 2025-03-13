
import React, { useEffect, useState, useRef } from 'react';
import TournamentBracket from '../components/TournamentBracket';
import TournamentHeader from '../components/tournament/TournamentHeader';
import TournamentControls from '../components/tournament/TournamentControls';
import ActiveMatch from '../components/tournament/ActiveMatch';
import { useTournament } from '../components/tournament/useTournament';
import { toast } from 'sonner';

interface TournamentProps {
  embeddedMode?: boolean;
}

const Tournament: React.FC<TournamentProps> = ({ embeddedMode = false }) => {
  const [isSimulationStuck, setIsSimulationStuck] = useState(false);
  const recoveryAttemptsRef = useRef(0);
  const lastProgressTimeRef = useRef(Date.now());
  
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

  // Keep track of tournament progress to detect if it's stuck
  useEffect(() => {
    if (autoSimulation && !simulationPaused) {
      lastProgressTimeRef.current = Date.now();
      recoveryAttemptsRef.current = 0;
    }
  }, [matchesPlayed, currentRound, autoSimulation, simulationPaused]);

  // Check if current round is complete and needs to advance
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

  // Comprehensive stuck simulation detection and recovery
  useEffect(() => {
    if (!autoSimulation || simulationPaused) {
      return;
    }
    
    const stuckCheckInterval = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastProgress = currentTime - lastProgressTimeRef.current;
      
      // If no progress for 5 seconds, try recovery steps
      if (timeSinceLastProgress > 5000) {
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
            
            if (embeddedMode) {
              simulateSingleMatch(nextMatch);
            } else {
              playMatch(nextMatch);
            }
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
          // Ya no usamos randomize para simular toda la ronda
          // Intentamos jugar el siguiente partido individualmente
          const nextMatch = matches.find(m => 
            m.round === currentRound && !m.played && m.teamA && m.teamB
          );
          
          if (nextMatch) {
            console.log("Recovery attempt: Force playing next available match");
            lastProgressTimeRef.current = currentTime;
            simulateSingleMatch(nextMatch);
          }
        } else {
          // Last resort: restart auto simulation
          console.log("Recovery attempt: Restarting auto simulation");
          setAutoSimulation(false);
          
          setTimeout(() => {
            startAutoSimulation();
            lastProgressTimeRef.current = currentTime;
          }, 1000);
        }
        
        recoveryAttemptsRef.current++;
        
        // If too many recovery attempts, stop auto simulation
        if (recoveryAttemptsRef.current > 8) {
          console.log("Too many recovery attempts - stopping auto simulation");
          setAutoSimulation(false);
          toast.error("Tournament simulation stopped", {
            description: "The simulation appears to be stuck. Try resuming manually."
          });
        }
        
        setIsSimulationStuck(false);
      }
    }, 1000); // Check every second
    
    return () => {
      clearInterval(stuckCheckInterval);
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
    startAutoSimulation
  ]);

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
