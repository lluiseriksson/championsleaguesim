
import React from 'react';
import { Button } from '../../components/ui/button';
import { RefreshCw, Play } from 'lucide-react';

interface TournamentControlsProps {
  currentRound: number;
  autoSimulation: boolean;
  resetTournament: () => void;
  startAutoSimulation: () => void;
}

const TournamentControls: React.FC<TournamentControlsProps> = ({
  currentRound,
  autoSimulation,
  resetTournament,
  startAutoSimulation
}) => {
  console.log("TournamentControls rendered: autoSimulation =", autoSimulation, "currentRound =", currentRound);
  
  if (currentRound > 7) {
    return (
      <Button 
        onClick={resetTournament}
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Reset Tournament
      </Button>
    );
  }

  return (
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
          onClick={() => {
            console.log("Auto simulation button clicked");
            startAutoSimulation();
          }}
          variant="default"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Play className="h-4 w-4" />
          Start Auto Simulation
        </Button>
      )}
    </div>
  );
};

export default TournamentControls;
