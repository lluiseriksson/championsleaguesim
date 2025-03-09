
import React, { useState, useEffect } from 'react';
import TournamentMatch from '../../components/game/TournamentMatch';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';
import { toast } from 'sonner';
import { checkTeamColorConflict, generateAlternativeKit } from '../../types/kits/kitConflictChecker';

interface ActiveMatchProps {
  activeMatch: Match;
  onBackClick: () => void;
  onMatchComplete: (winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => void;
}

const ActiveMatch: React.FC<ActiveMatchProps> = ({
  activeMatch,
  onBackClick,
  onMatchComplete
}) => {
  const [kitConflictChecked, setKitConflictChecked] = useState(false);
  
  useEffect(() => {
    if (activeMatch && activeMatch.teamA && activeMatch.teamB && !kitConflictChecked) {
      const homeTeam = activeMatch.teamA.name;
      const awayTeam = activeMatch.teamB.name;
      
      // Check for color conflicts between teams
      const conflictResult = checkTeamColorConflict(homeTeam, awayTeam);
      
      if (conflictResult.hasConflict) {
        // Generate an alternative kit if conflict detected
        const alternativeKit = generateAlternativeKit(homeTeam, awayTeam);
        
        toast.info("Kit conflict detected", {
          description: `${awayTeam} will use a special kit to avoid color conflict with ${homeTeam}`,
          duration: 3000
        });
        
        console.log(`Kit conflict detected between ${homeTeam} and ${awayTeam}`, conflictResult.conflictDetails);
        console.log(`Alternative kit generated:`, alternativeKit);
      }
      
      setKitConflictChecked(true);
    }
  }, [activeMatch, kitConflictChecked]);

  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) return null;

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <button 
        onClick={onBackClick}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
      >
        ← Back to Tournament
      </button>
      <TournamentMatch 
        homeTeam={activeMatch.teamA.name}
        awayTeam={activeMatch.teamB.name}
        onMatchComplete={onMatchComplete}
        matchDuration={60} // 60 real seconds match duration
      />
    </div>
  );
};

export default ActiveMatch;
