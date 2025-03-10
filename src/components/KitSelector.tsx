import React, { useState, useEffect, useMemo } from 'react';
import { 
  teamKitColors, 
  getPositionSpecificKits, 
  KitSelectionResult,
  PlayerPosition
} from '../types/kits';
import { 
  performFinalKitCheck, 
  teamHasRedPrimaryColor,
  teamHasRedSecondaryColor,
  teamHasWhitePrimaryColor,
  teamHasBlackPrimaryColor,
  teamHasBluePrimaryColor,
  areTeamsInConflictList,
  checkWhiteKitConflict,
  checkBlackKitConflict,
  checkBlueKitConflict,
  checkPrimarySecondaryConflict
} from '../types/kits/kitConflictChecker';
import { Button } from './ui/button';

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

  const checkForKitConflict = () => {
    if (!homeTeam || !awayTeam || !kitResult) return null;
    
    const isKnownConflict = areTeamsInConflictList(homeTeam, awayTeam);
    
    if (isKnownConflict) {
      return (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm font-semibold mb-1">⚠️ Known Kit Conflict!</p>
          <p className="text-xs">
            {homeTeam} and {awayTeam} have similar kit colors that would cause confusion.
            In a real match, {awayTeam} would need to use their third kit.
          </p>
        </div>
      );
    }
    
    const whiteKitConflict = checkWhiteKitConflict(homeTeam, awayTeam, kitResult.awayTeamKitType);
    
    if (whiteKitConflict) {
      return (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm font-semibold mb-1">⚠️ White Kit Conflict!</p>
          <p className="text-xs">
            Both {homeTeam} and {awayTeam} are using white kits which would cause confusion.
            In a real match, {awayTeam} would need to use their third kit.
          </p>
        </div>
      );
    }
    
    const blackKitConflict = checkBlackKitConflict(homeTeam, awayTeam, kitResult.awayTeamKitType);
    
    if (blackKitConflict) {
      return (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm font-semibold mb-1">⚠️ Black Kit Conflict!</p>
          <p className="text-xs">
            Both {homeTeam} and {awayTeam} have black primary colors in their selected kits.
            This would cause confusion during a match.
          </p>
        </div>
      );
    }
    
    const blueKitConflict = checkBlueKitConflict(homeTeam, awayTeam, kitResult.awayTeamKitType);
    
    if (blueKitConflict) {
      return (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm font-semibold mb-1">⚠️ Blue Kit Conflict!</p>
          <p className="text-xs">
            Both {homeTeam} and {awayTeam} have blue primary colors in their selected kits.
            This would cause confusion during a match.
          </p>
        </div>
      );
    }
    
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
    
    const homeHasRedPrimary = teamHasRedPrimaryColor(homeTeam, 'home');
    const awayHasRedSecondary = teamHasRedSecondaryColor(awayTeam, kitResult.awayTeamKitType);
    const awayHasRedPrimary = teamHasRedPrimaryColor(awayTeam, kitResult.awayTeamKitType);
    const homeHasRedSecondary = teamHasRedSecondaryColor(homeTeam, 'home');
    
    if ((homeHasRedPrimary && awayHasRedSecondary) || (awayHasRedPrimary && homeHasRedSecondary)) {
      return (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm font-semibold mb-1">⚠️ Red Primary-Secondary Color Conflict!</p>
          <p className="text-xs">
            One team has a red primary color while the other has a red secondary color.
            This would cause confusion during a match.
          </p>
        </div>
      );
    }
    
    const primarySecondaryConflict = checkPrimarySecondaryConflict(
      homeTeam, 
      awayTeam, 
      'home', 
      kitResult.awayTeamKitType
    );
    
    if (primarySecondaryConflict) {
      return (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          <p className="text-sm font-semibold mb-1">⚠️ Primary-Secondary Color Conflict!</p>
          <p className="text-xs">
            The primary color of one team is too similar to the secondary color of the other team,
            which could cause confusion during the match.
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
    
    return (
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
        <p className="text-sm font-semibold mb-1">✓ No Kit Conflicts</p>
        <p className="text-xs">
          The selected kits for {homeTeam} and {awayTeam} provide sufficient contrast.
        </p>
      </div>
    );
  };

  const testSevillaVsCrvenaZvezda = () => {
    setHomeTeam('Sevilla');
    setAwayTeam('Crvena Zvezda');
  };
  
  const testLeverkusenVsMonza = () => {
    setHomeTeam('Leverkusen');
    setAwayTeam('Monza');
  };
  
  const testAtlantaVsLeicester = () => {
    setHomeTeam('Atlanta');
    setAwayTeam('Leicester');
  };
  
  const testLiverpoolVsGenova = () => {
    setHomeTeam('Liverpool');
    setAwayTeam('Genova');
  };
  
  const testFreiburgVsStrasbourg = () => {
    setHomeTeam('Freiburg');
    setAwayTeam('Strasbourg');
  };
  
  const testGironaVsCelta = () => {
    setHomeTeam('Girona');
    setAwayTeam('Celta');
  };
  
  const testBrestVsFCKobenhavn = () => {
    setHomeTeam('Brest');
    setAwayTeam('FC København');
  };
  
  const testFulhamVsLasPalmas = () => {
    setHomeTeam('Fulham');
    setAwayTeam('Las Palmas');
  };
  
  const testRBLeipzigVsBraga = () => {
    setHomeTeam('RB Leipzig');
    setAwayTeam('Braga');
  };
  
  const testInterVsManUnited = () => {
    setHomeTeam('Inter');
    setAwayTeam('Man United');
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
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button 
          variant="outline" 
          onClick={testSevillaVsCrvenaZvezda}
          className="w-full text-xs"
        >
          Sevilla vs Crvena Zvezda
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testLeverkusenVsMonza}
          className="w-full text-xs"
        >
          Leverkusen vs Monza
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testAtlantaVsLeicester}
          className="w-full text-xs"
        >
          Atlanta vs Leicester
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testLiverpoolVsGenova}
          className="w-full text-xs"
        >
          Liverpool vs Genova
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testFreiburgVsStrasbourg}
          className="w-full text-xs"
        >
          Freiburg vs Strasbourg
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testGironaVsCelta}
          className="w-full text-xs"
        >
          Girona vs Celta
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testBrestVsFCKobenhavn}
          className="w-full text-xs"
        >
          Brest vs FC København
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testFulhamVsLasPalmas}
          className="w-full text-xs"
        >
          Fulham vs Las Palmas
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testRBLeipzigVsBraga}
          className="w-full text-xs"
        >
          RB Leipzig vs Braga
        </Button>
        
        <Button 
          variant="outline" 
          onClick={testInterVsManUnited}
          className="w-full text-xs"
        >
          Inter vs Man United
        </Button>
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
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mb-1 border border-gray-300" 
                  style={{ backgroundColor: teamKitColors[homeTeam]?.home?.secondary || '#CCCCCC' }}
                ></div>
                <span className="text-xs">Secondary</span>
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
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mb-1 border border-gray-300" 
                  style={{ backgroundColor: teamKitColors[awayTeam]?.[kitResult.awayTeamKitType]?.secondary || '#CCCCCC' }}
                ></div>
                <span className="text-xs">Secondary</span>
              </div>
            </div>
          </div>
          
          {checkForKitConflict()}
          
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
