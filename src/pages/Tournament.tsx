
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

  const winner = getWinner();

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
          simulationPaused={simulationPaused}
          resetTournament={resetTournament}
          startAutoSimulation={startAutoSimulation}
          randomizeRound={randomizeCurrentRound}
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
      ) : null}
      
      <div className="overflow-x-auto">
        <div className="flex justify-start">
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
            winnerTeam={winner}
          />
        </div>
      </div>
    </div>
  );
};

export default Tournament;
