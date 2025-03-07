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

  // Transliterate Russian team names to Latin alphabet
  const transliterateRussianName = (name: string): string => {
    // Special case for Greek team
    if (name === 'Ολυμπιακός') return 'Olympiakos';
    
    // Map of Cyrillic to Latin characters
    const cyrillicToLatin: Record<string, string> = {
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 
      'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    // Check if the name has Cyrillic characters
    const hasCyrillic = /[А-Яа-яЁё]/.test(name);
    
    if (!hasCyrillic) return name;
    
    // Transliterate character by character
    let result = '';
    for (let i = 0; i < name.length; i++) {
      const char = name[i];
      result += cyrillicToLatin[char] || char;
    }
    
    return result;
  };

  // Function to display team name (with transliteration for Russian teams)
  const getDisplayTeamName = (team?: TournamentTeam): string => {
    if (!team) return "TBD";
    return transliterateRussianName(team.name);
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
                    {getDisplayTeamName(match.teamA)}
                  </span>
                  <div className="flex items-center gap-2 justify-end">
                    {match.played && match.score && (
                      <span className="text-sm font-bold text-left">{match.score.teamA}</span>
                    )}
                  </div>
                </div>
                
                <div 
                  className={`team-entry p-2 rounded flex justify-between items-center ${isWinner(match, match.teamB) ? 'bg-green-50' : ''}`}
                  style={getTeamColorStyle(match.teamB)}
                >
                  <span className="font-medium truncate max-w-[65%]">
                    {getDisplayTeamName(match.teamB)}
                  </span>
                  <div className="flex items-center gap-2 justify-end">
                    {match.played && match.score && (
                      <span className="text-sm font-bold text-left">{match.score.teamB}</span>
                    )}
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
