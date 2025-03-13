
import React, { useEffect, useState } from 'react';
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
    setCurrentRound
  } = useTournament(embeddedMode);

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

  // Add safety check for stuck simulation
  useEffect(() => {
    let stuckTimer: NodeJS.Timeout;
    
    if (autoSimulation && !playingMatch) {
      stuckTimer = setTimeout(() => {
        const anyPendingMatches = matches.some(m => 
          m.round === currentRound && !m.played && m.teamA && m.teamB
        );
        
        if (anyPendingMatches) {
          setIsSimulationStuck(true);
          console.log("Simulation appears to be stuck, attempting to restart the process");
          
          // Attempt to fix stuck simulation by restarting auto-simulation
          const nextMatch = matches.find(m => 
            m.round === currentRound && !m.played && m.teamA && m.teamB
          );
          
          if (nextMatch) {
            if (embeddedMode) {
              simulateSingleMatch(nextMatch);
            } else {
              playMatch(nextMatch);
            }
            setIsSimulationStuck(false);
          }
        }
      }, 2000); // Check after 2 seconds of inactivity
    }
    
    return () => {
      clearTimeout(stuckTimer);
    };
  }, [autoSimulation, playingMatch, matches, currentRound, embeddedMode, simulateSingleMatch, playMatch]);

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
