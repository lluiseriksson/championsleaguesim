
import React, { useState, useEffect } from 'react';
import TournamentBracket from '../components/TournamentBracket';
import TournamentHeader from '../components/tournament/TournamentHeader';
import TournamentControls from '../components/tournament/TournamentControls';
import ActiveMatch from '../components/tournament/ActiveMatch';
import { useTournament } from '../components/tournament/useTournament';

interface TournamentProps {
  embeddedMode?: boolean;
}

const Tournament: React.FC<TournamentProps> = ({ embeddedMode = false }) => {
  const {
    matches,
    currentRound,
    activeMatch,
    playingMatch,
    autoSimulation,
    resetTournament,
    playMatch,
    simulateSingleMatch,
    handleMatchComplete,
    startAutoSimulation,
    getWinner,
    setActiveMatch,
    setPlayingMatch
  } = useTournament(embeddedMode);

  const [showBracket, setShowBracket] = useState(true);

  // Always show both the bracket and active match during auto simulation
  useEffect(() => {
    if (playingMatch && activeMatch && !embeddedMode && !autoSimulation) {
      setShowBracket(false);
    } else {
      setShowBracket(true);
    }
  }, [playingMatch, activeMatch, embeddedMode, autoSimulation]);

  return (
    <div className="container mx-auto px-4 py-8">
      <TournamentHeader 
        currentRound={currentRound}
        getWinner={getWinner}
      />
      
      <div className="mb-6 flex items-center justify-between">
        <TournamentControls
          currentRound={currentRound}
          autoSimulation={autoSimulation}
          resetTournament={resetTournament}
          startAutoSimulation={startAutoSimulation}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        {showBracket && (
          <div className="overflow-x-auto mb-8">
            <TournamentBracket 
              matches={matches} 
              onMatchClick={(match) => {
                if (!autoSimulation && match.teamA && match.teamB && !match.played) {
                  if (embeddedMode) {
                    simulateSingleMatch(match);
                  } else {
                    playMatch(match);
                    setShowBracket(false);
                  }
                }
              }}
              showFullBracket={true}
            />
          </div>
        )}
        
        {(!showBracket || autoSimulation) && activeMatch && activeMatch.teamA && activeMatch.teamB && (
          <div className={`${autoSimulation ? "mt-8 border-t pt-8" : ""}`}>
            {autoSimulation && <h3 className="text-xl font-bold mb-4">Current Match</h3>}
            <ActiveMatch
              activeMatch={activeMatch}
              onBackClick={() => {
                if (!autoSimulation) {
                  setActiveMatch(null);
                  setPlayingMatch(false);
                  setShowBracket(true);
                }
              }}
              onMatchComplete={handleMatchComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournament;
