
import React from 'react';
import { Trophy } from 'lucide-react';
import { TournamentTeam } from '../../types/tournament';
import { getTeamKitColor } from '../../types/teamKits';

interface TournamentHeaderProps {
  currentRound: number;
  getWinner: () => TournamentTeam | undefined;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({ 
  currentRound,
  getWinner
}) => {
  const getTournamentStatus = () => {
    if (currentRound <= 7) {
      const roundNames = ["", "Round of 128", "Round of 64", "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
      return roundNames[currentRound] || "Tournament in Progress";
    } else {
      const winner = getWinner();
      return winner ? `Tournament Complete - Winner: ${winner.name}` : "Tournament Complete";
    }
  };

  const winner = getWinner();
  const showTrophy = winner !== undefined;
  
  const winnerColor = winner ? getTeamKitColor(winner.name, 'home') : '#FFC107';

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-center">Champions League Simulator</h1>
      
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{getTournamentStatus()}</h2>
        
        {showTrophy && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="bg-gradient-to-b from-amber-200 to-amber-500 p-4 rounded-lg shadow-lg flex items-center justify-center">
              <Trophy className="h-8 w-8 text-amber-800" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-amber-500 font-bold text-lg">Champion</span>
              <span 
                className="font-bold text-xl"
                style={{ color: winnerColor }}
              >
                {winner.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TournamentHeader;
