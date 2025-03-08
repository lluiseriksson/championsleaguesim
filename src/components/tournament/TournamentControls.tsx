
import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { RefreshCcw, PlayCircle, Trophy, Loader2, Dices } from 'lucide-react';

interface TournamentControlsProps {
  currentRound: number;
  autoSimulation: boolean;
  simulationPaused?: boolean;
  resetTournament: () => void;
  startAutoSimulation: () => void;
  randomizeRound?: () => void;
}

const TournamentControls: React.FC<TournamentControlsProps> = ({ 
  currentRound, 
  autoSimulation,
  simulationPaused = false,
  resetTournament,
  startAutoSimulation,
  randomizeRound
}) => {
  const isComplete = currentRound > 7;
  
  return (
    <div className="flex space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={resetTournament}
              disabled={autoSimulation && !isComplete}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset the entire tournament</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!isComplete && randomizeRound && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="secondary"
                size="sm"
                onClick={randomizeRound}
                disabled={autoSimulation}
              >
                <Dices className="h-4 w-4 mr-2" />
                Randomize Round
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Randomly determine all matches in current round</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {!isComplete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={autoSimulation ? "secondary" : "default"}
                size="sm"
                onClick={startAutoSimulation}
                disabled={autoSimulation}
              >
                {autoSimulation ? (
                  simulationPaused ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Paused...
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulating...
                    </>
                  )
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Auto-Simulate
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Automatically simulate all matches</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {isComplete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default"
                size="sm"
                onClick={resetTournament}
              >
                <Trophy className="h-4 w-4 mr-2" />
                New Tournament
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start a new tournament</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default TournamentControls;
