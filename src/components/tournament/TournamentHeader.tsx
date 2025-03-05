
import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { TournamentTeam } from '../../types/tournament';

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

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-center">Football Tournament</h1>
      
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{getTournamentStatus()}</h2>
        
        {currentRound > 7 && getWinner() && (
          <div className="flex items-center text-amber-500 font-bold gap-2">
            <Trophy className="h-6 w-6" />
            <span>Champion: {getWinner()?.name}</span>
          </div>
        )}
      </div>
      
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
      </div>
    </>
  );
};

export default TournamentHeader;
