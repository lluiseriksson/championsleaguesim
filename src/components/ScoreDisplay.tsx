
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

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full font-bold text-xl shadow-md z-20 flex items-center">
      <span 
        className="mr-2 text-sm font-medium px-2 py-1 rounded"
        style={{ backgroundColor: `${homeTeamColor}40`, color: isDarkColor(homeTeamColor) ? 'white' : 'black' }}
      >
        {homeTeam}
      </span>
      <span className="text-red-600">{score.red}</span>
      <span className="mx-2">-</span>
      <span className="text-blue-600">{score.blue}</span>
      <span 
        className="ml-2 text-sm font-medium px-2 py-1 rounded"
        style={{ backgroundColor: `${awayTeamColor}40`, color: isDarkColor(awayTeamColor) ? 'white' : 'black' }}
      >
        {awayTeam}
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

export default ScoreDisplay;
