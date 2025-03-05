
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Trophy, RefreshCw, Play } from 'lucide-react';
import { toast } from 'sonner';
import { TournamentTeam } from '../../types/tournament';

interface TournamentHeaderProps {
  currentRound: number;
  resetTournament: () => void;
  startAutoSimulation: () => void;
  autoSimulation: boolean;
  getWinner: () => TournamentTeam | undefined;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({ 
  currentRound, 
  resetTournament, 
  startAutoSimulation, 
  autoSimulation, 
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
        {currentRound <= 7 ? (
          <div className="flex gap-4">
            <Button 
              onClick={resetTournament}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Tournament
            </Button>
            {!autoSimulation && (
              <Button 
                onClick={startAutoSimulation}
                variant="default"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Start Auto Simulation
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex items-center text-amber-500 font-bold gap-2">
                <Trophy className="h-6 w-6" />
                <span>Champion: {getWinner()?.name}</span>
              </div>
              {getWinner() && (
                <div className="text-sm text-gray-600">
                  ELO Rating: {getWinner()?.eloRating}
                </div>
              )}
            </div>
            <Button 
              onClick={resetTournament}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Tournament
            </Button>
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
