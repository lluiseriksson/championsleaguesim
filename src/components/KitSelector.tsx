import React, { useState, useEffect } from 'react';
import { 
  teamKitColors, 
  getPositionSpecificKits, 
  KitSelectionResult,
  PlayerPosition
} from '../types/kits';
import { performFinalKitCheck, teamHasRedPrimaryColor } from '../types/kits/kitConflictChecker';

const KitSelector: React.FC = () => {
  const [homeTeam, setHomeTeam] = useState<string>('Liverpool');
  const [awayTeam, setAwayTeam] = useState<string>('Barcelona');
  const [kitResult, setKitResult] = useState<KitSelectionResult | null>(null);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    const availableTeams = Object.keys(teamKitColors);
    setTeams(availableTeams);
  }, []);

  useEffect(() => {
    if (homeTeam && awayTeam) {
      const result = getPositionSpecificKits(homeTeam, awayTeam);
      setKitResult(result);
    }
  }, [homeTeam, awayTeam]);

  const getKitColor = (team: string, kitType: string, position: PlayerPosition) => {
    if (!teamKitColors[team]) return '#CCCCCC';
    
    if (position === 'goalkeeper') {
      return teamKitColors[team].goalkeeper.primary;
    }
    
    return teamKitColors[team][kitType as keyof typeof teamKitColors[string]].primary;
  };

  const checkForRedKitConflict = () => {
    if (!homeTeam || !awayTeam || !kitResult) return null;
    
    const homeIsRed = teamHasRedPrimaryColor(homeTeam, 'home');
    const awayIsRed = teamHasRedPrimaryColor(awayTeam, kitResult.awayTeamKitType);
    
    if (homeIsRed && awayIsRed) {
      return (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm font-semibold mb-1">⚠️ Red Kit Conflict!</p>
          <p className="text-xs">
            Both {homeTeam} and {awayTeam} have red primary colors in their selected kits.
            This would cause confusion during a match.
          </p>
        </div>
      );
    }
    
    const kitCheckPassed = performFinalKitCheck(homeTeam, awayTeam, kitResult.awayTeamKitType);
    
    if (!kitCheckPassed) {
      return (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          <p className="text-sm font-semibold mb-1">⚠️ Color Conflict Detected</p>
          <p className="text-xs">
            The kit colors selected for {homeTeam} and {awayTeam} may cause confusion.
            In a real match, {awayTeam} would need to use their third kit.
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Kit Conflict Analyzer</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Home Team</label>
          <select 
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
          >
            {teams.map(team => (
              <option key={`home-${team}`} value={team}>{team}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Away Team</label>
          <select 
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
          >
            {teams.map(team => (
              <option key={`away-${team}`} value={team}>{team}</option>
            ))}
          </select>
        </div>
      </div>
      
      {kitResult && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Kit Selection Result</h3>
          <p className="mb-1">
            <span className="font-medium">Away Team Main Kit:</span> {kitResult.awayTeamKitType}
          </p>
          <p className="mb-3">
            <span className="font-medium">Needs Special Kit:</span> {kitResult.needsSpecialKit ? 'Yes' : 'No'}
          </p>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Home Team Kits</h4>
            <div className="flex space-x-4 mb-4">
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mb-1" 
                  style={{ backgroundColor: getKitColor(homeTeam, 'home', 'goalkeeper') }}
                ></div>
                <span className="text-xs">GK</span>
              </div>
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mb-1" 
                  style={{ backgroundColor: getKitColor(homeTeam, 'home', 'defender') }}
                ></div>
                <span className="text-xs">Outfield</span>
              </div>
            </div>
            
            <h4 className="font-medium mb-2">Away Team Selected Kits</h4>
            <div className="flex space-x-4">
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mb-1" 
                  style={{ backgroundColor: getKitColor(awayTeam, kitResult.positionSpecificKits?.goalkeeper || 'away', 'goalkeeper') }}
                ></div>
                <span className="text-xs">GK</span>
              </div>
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mb-1" 
                  style={{ backgroundColor: getKitColor(awayTeam, kitResult.awayTeamKitType, 'defender') }}
                ></div>
                <span className="text-xs">Outfield</span>
              </div>
            </div>
          </div>
          
          {checkForRedKitConflict()}
          
          {kitResult.conflictDescription && (
            <div className="mt-4 bg-gray-50 p-2 rounded text-xs font-mono whitespace-pre-wrap">
              {kitResult.conflictDescription}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KitSelector;
