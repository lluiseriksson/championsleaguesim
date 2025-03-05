
import React from 'react';
import { getTeamKitColor, KitType } from '../types/teamKits';
import { Match, TournamentTeam } from '../types/tournament';

interface TournamentBracketProps {
  matches: Match[];
  onMatchClick?: (match: Match) => void;
  showFullBracket?: boolean;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ 
  matches, 
  onMatchClick,
  showFullBracket = false
}) => {
  // Group matches by round
  const roundMatches = Array.from({ length: 7 }, (_, i) => {
    return matches.filter(match => match.round === i + 1);
  });
  
  // Get match by round and position
  const getMatch = (round: number, position: number) => {
    return matches.find(match => match.round === round && match.position === position);
  };
  
  // Determine CSS class for a match based on its status
  const getMatchClass = (match: Match) => {
    if (!match.teamA || !match.teamB) return "opacity-50";
    if (match.played) return "opacity-100";
    return "opacity-80";
  };

  // Get background color style based on team's kit color
  const getTeamColorStyle = (team?: TournamentTeam) => {
    if (!team) return {};
    
    // Use the team's name to get the kit color from our system
    const kitColor = getTeamKitColor(team.name, 'home' as KitType);
    return { 
      backgroundColor: `${kitColor}20`, 
      borderLeft: `4px solid ${kitColor}` 
    };
  };

  // Determine if a team is the winner of a match
  const isWinner = (match: Match, team?: TournamentTeam) => {
    if (!match.played || !match.winner || !team) return false;
    return match.winner.id === team.id;
  };

  const handleMatchClick = (match: Match) => {
    if (onMatchClick && match.teamA && match.teamB && !match.played) {
      onMatchClick(match);
    }
  };

  // Determine how many rounds to display
  const displayRounds = showFullBracket 
    ? roundMatches 
    : roundMatches.slice(0, 7); // Show all rounds

  return (
    <div className="tournament-bracket flex overflow-x-auto min-w-full" style={{ minWidth: '1600px' }}>
      {displayRounds.map((matches, roundIndex) => (
        <div key={roundIndex} className="round-column flex-1 px-2 min-w-[200px]">
          <h3 className="text-center font-semibold mb-4">
            {roundIndex === 0 ? "Round of 128" : 
             roundIndex === 1 ? "Round of 64" : 
             roundIndex === 2 ? "Round of 32" : 
             roundIndex === 3 ? "Round of 16" : 
             roundIndex === 4 ? "Quarter-finals" : 
             roundIndex === 5 ? "Semi-finals" : "Final"}
          </h3>
          
          <div className={`flex flex-col gap-${7 - roundIndex} justify-around h-auto`} 
               style={{ gap: `${Math.pow(2, roundIndex + 1) * 2}px` }}>
            
            {matches.map(match => (
              <div 
                key={match.id} 
                className={`match-container relative p-2 border rounded-md shadow-sm mb-1 ${getMatchClass(match)} ${match.teamA && match.teamB && !match.played ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                onClick={() => handleMatchClick(match)}
              >
                <div 
                  className={`team-entry p-2 rounded flex justify-between items-center mb-1 ${isWinner(match, match.teamA) ? 'bg-green-50' : ''}`}
                  style={getTeamColorStyle(match.teamA)}
                >
                  <span className="font-medium truncate max-w-[65%]">
                    {match.teamA?.name || "TBD"}
                  </span>
                  <div className="flex items-center gap-2 justify-end">
                    {match.played && match.score && (
                      <span className="text-sm font-bold text-left">{match.score.teamA}</span>
                    )}
                    {/* Seed ranking display removed */}
                  </div>
                </div>
                
                <div 
                  className={`team-entry p-2 rounded flex justify-between items-center ${isWinner(match, match.teamB) ? 'bg-green-50' : ''}`}
                  style={getTeamColorStyle(match.teamB)}
                >
                  <span className="font-medium truncate max-w-[65%]">
                    {match.teamB?.name || "TBD"}
                  </span>
                  <div className="flex items-center gap-2 justify-end">
                    {match.played && match.score && (
                      <span className="text-sm font-bold text-left">{match.score.teamB}</span>
                    )}
                    {/* Seed ranking display removed */}
                  </div>
                </div>
                
                {match.played && match.winner && (
                  <div className="absolute -right-1 -top-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </div>
                )}
                
                {match.played && match.goldenGoal && (
                  <div className="absolute -left-1 -top-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold" title="Golden Goal">
                    ⚽
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentBracket;
