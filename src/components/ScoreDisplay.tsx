
import React from 'react';
import { Score } from '../types/football';
import { getTeamKitColor, KitType } from '../types/teamKits';

interface ScoreDisplayProps {
  score: Score;
  homeTeam?: string;
  awayTeam?: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, homeTeam = 'Home', awayTeam = 'Away' }) => {
  // Get team colors for display
  const homeTeamColor = getTeamKitColor(homeTeam, 'home');
  const awayTeamColor = getTeamKitColor(awayTeam, 'away');

  // For transliteration if needed (particularly for Russian team names)
  const displayHomeTeam = transliterateRussianName(homeTeam);
  const displayAwayTeam = transliterateRussianName(awayTeam);

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full font-bold text-xl shadow-md z-20 flex items-center">
      <span 
        className="mr-2 text-sm font-medium px-2 py-1 rounded"
        style={{ backgroundColor: `${homeTeamColor}40`, color: isDarkColor(homeTeamColor) ? 'white' : 'black' }}
      >
        {displayHomeTeam}
      </span>
      <span className="text-black">{score.red}</span>
      <span className="mx-2">-</span>
      <span className="text-black">{score.blue}</span>
      <span 
        className="ml-2 text-sm font-medium px-2 py-1 rounded"
        style={{ backgroundColor: `${awayTeamColor}40`, color: isDarkColor(awayTeamColor) ? 'white' : 'black' }}
      >
        {displayAwayTeam}
      </span>
    </div>
  );
};

// Helper function to determine if a color is dark (for text contrast)
function isDarkColor(hexColor: string): boolean {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Formula to determine perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if color is dark (brightness < 128)
  return brightness < 128;
}

// Add the transliteration function with enhanced special cases
const transliterateRussianName = (name: string): string => {
  // Special cases for non-Russian but special character teams
  if (name === 'Ολυμπιακός') return 'Olympiakos';
  if (name === 'FC København') return 'FC Copenhagen';
  
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

  const hasCyrillic = /[А-Яа-яЁё]/.test(name);
  
  if (!hasCyrillic) return name;
  
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    result += cyrillicToLatin[char] || char;
  }
  
  return result;
};

export default ScoreDisplay;
