
import React from 'react';
import { getTeamKitColor } from '../types/teamKits';

interface TournamentTeam {
  id: number;
  name: string;
  seed: number;
  eloRating: number;
  kitColors: {
    home: string;
    away: string;
    third: string;
  };
}

interface Match {
  id: number;
  round: number;
  position: number;
  teamA?: TournamentTeam;
  teamB?: TournamentTeam;
  winner?: TournamentTeam;
  played: boolean;
}

interface TournamentBracketProps {
  matches: Match[];
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ matches }) => {
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
    
    const kitColor = team.kitColors.home;
    return { 
      backgroundColor: `${kitColor}20`, 
      borderLeft: `4px solid ${kitColor}` 
    };
  };

  return (
    <div className="tournament-bracket flex overflow-x-auto min-w-full" style={{ minWidth: '1600px' }}>
      {roundMatches.map((matches, roundIndex) => (
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
                className={`match-container relative p-2 border rounded-md shadow-sm mb-1 ${getMatchClass(match)}`}
              >
                <div 
                  className="team-entry p-2 rounded flex justify-between items-center mb-1"
                  style={getTeamColorStyle(match.teamA)}
                >
                  <span className="font-medium truncate max-w-[70%]">
                    {match.teamA?.name || "TBD"}
                  </span>
                  <span className="text-xs">
                    {match.teamA?.seed && `#${match.teamA.seed}`}
                  </span>
                </div>
                
                <div 
                  className="team-entry p-2 rounded flex justify-between items-center"
                  style={getTeamColorStyle(match.teamB)}
                >
                  <span className="font-medium truncate max-w-[70%]">
                    {match.teamB?.name || "TBD"}
                  </span>
                  <span className="text-xs">
                    {match.teamB?.seed && `#${match.teamB.seed}`}
                  </span>
                </div>
                
                {match.played && match.winner && (
                  <div className="absolute -right-1 -top-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
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
