
import React from 'react';
import TournamentBracket from '../components/TournamentBracket';
import TournamentHeader from '../components/tournament/TournamentHeader';
import ActiveMatch from '../components/tournament/ActiveMatch';
import { useTournamentLogic } from '../components/tournament/useTournamentLogic';

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
    startAutoSimulation,
    handleMatchComplete,
    handleMatchClick,
    handleBackToTournament,
    getWinner
  } = useTournamentLogic(embeddedMode);

  return (
    <div className="container mx-auto px-4 py-8">
      <TournamentHeader
        currentRound={currentRound}
        resetTournament={resetTournament}
        startAutoSimulation={startAutoSimulation}
        autoSimulation={autoSimulation}
        getWinner={getWinner}
      />
      
      {playingMatch && activeMatch && activeMatch.teamA && activeMatch.teamB && !embeddedMode ? (
        <ActiveMatch
          activeMatch={activeMatch}
          onBackToTournament={handleBackToTournament}
          onMatchComplete={handleMatchComplete}
        />
      ) : (
        <div className="mb-6 text-center">
          <p className="text-gray-600">
            Tournament using real ELO ratings to determine team strength.
            <br />
            Higher ELO teams maintain full strength while lower ELO teams have reduced capabilities.
          </p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <TournamentBracket 
          matches={matches} 
          onMatchClick={handleMatchClick}
          showFullBracket={true}
        />
      </div>
    </div>
  );
};

export default Tournament;
