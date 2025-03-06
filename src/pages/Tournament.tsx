
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

  console.log("Tournament rendered: autoSimulation =", autoSimulation, "activeMatch =", activeMatch?.id, "playingMatch =", playingMatch);

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
        {/* Always show the bracket */}
        <div className="overflow-x-auto mb-8">
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
        
        {/* Show the active match when it exists */}
        {activeMatch && activeMatch.teamA && activeMatch.teamB && (
          <div className="border-t pt-8">
            <h3 className="text-xl font-bold mb-4">Current Match</h3>
            <ActiveMatch
              activeMatch={activeMatch}
              onBackClick={() => {
                if (!autoSimulation) {
                  setActiveMatch(null);
                  setPlayingMatch(false);
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
