
import React from 'react';
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
      
      {playingMatch && activeMatch && activeMatch.teamA && activeMatch.teamB && !embeddedMode ? (
        <ActiveMatch
          activeMatch={activeMatch}
          onBackClick={() => {
            setActiveMatch(null);
            setPlayingMatch(false);
          }}
          onMatchComplete={handleMatchComplete}
        />
      ) : (
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
      )}
    </div>
  );
};

export default Tournament;
