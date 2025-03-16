
import React, { useState, useEffect } from 'react';
import TournamentMatch from '../../components/game/TournamentMatch';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';
import { toast } from 'sonner';
import { checkTeamColorConflict, generateAlternativeKit } from '../../types/kits/kitConflictChecker';
import { teamKitColors } from '../../types/kits/teamColorsData';
import { getAwayTeamKit } from '../../types/kits/kitSelection';
import { KitType } from '../../types/kits/kitTypes';
import { isWhiteColor, parseHexColor } from '../../types/kits/colorUtils';

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
  const [selectedAwayKitType, setSelectedAwayKitType] = useState<KitType>('away');
  
  useEffect(() => {
    if (activeMatch && activeMatch.teamA && activeMatch.teamB && !kitConflictChecked) {
      const homeTeam = activeMatch.teamA.name;
      const awayTeam = activeMatch.teamB.name;
      
      // Get home team kit colors (always use primary/home kit)
      const homeTeamKit = teamKitColors[homeTeam]?.home;
      if (!homeTeamKit) {
        console.warn(`Home team ${homeTeam} kit colors not found`);
      } else {
        console.log(`Home team ${homeTeam} using primary kit:`, homeTeamKit.primary);
      }
      
      // Special case for white kits - ensure we never have two white kits playing against each other
      const homeHasWhiteKit = homeTeamKit && isWhiteColor(homeTeamKit.primary);
      if (homeHasWhiteKit) {
        // Check if away team's away kit is also white
        const awayTeamAwayKit = teamKitColors[awayTeam]?.away;
        if (awayTeamAwayKit && isWhiteColor(awayTeamAwayKit.primary)) {
          // Force third kit for away team if their away kit is also white
          const thirdKit = teamKitColors[awayTeam]?.third;
          if (thirdKit && !isWhiteColor(thirdKit.primary)) {
            setSelectedAwayKitType('third');
            toast.info(`White kit conflict detected`, {
              description: `${awayTeam} will use third kit to avoid white-on-white conflict with ${homeTeam}`,
              duration: 4000
            });
            setKitConflictChecked(true);
            return;
          }
        }
      }
      
      // Enhanced logging for debugging kit conflicts
      console.log(`=============================================`);
      console.log(`Kit selection for match: ${homeTeam} vs ${awayTeam}`);
      console.log(`Home team ${homeTeam} primary color: ${homeTeamKit?.primary}`);
      
      const awayPrimaryKit = teamKitColors[awayTeam]?.away?.primary;
      const awayThirdKit = teamKitColors[awayTeam]?.third?.primary;
      
      if (awayPrimaryKit) {
        console.log(`Away team ${awayTeam} away kit color: ${awayPrimaryKit}`);
      }
      
      if (awayThirdKit) {
        console.log(`Away team ${awayTeam} third kit color: ${awayThirdKit}`);
      }
      
      // Calculate color similarities for logging
      if (homeTeamKit && awayPrimaryKit && awayThirdKit) {
        const homeRgb = parseHexColor(homeTeamKit.primary);
        const awayRgb = parseHexColor(awayPrimaryKit);
        const thirdRgb = parseHexColor(awayThirdKit);
        
        // Manual RGB comparison for debugging
        console.log(`Home RGB: R${homeRgb.r} G${homeRgb.g} B${homeRgb.b}`);
        console.log(`Away RGB: R${awayRgb.r} G${awayRgb.g} B${awayRgb.b}`);
        console.log(`Third RGB: R${thirdRgb.r} G${thirdRgb.g} B${thirdRgb.b}`);
        
        // Check for specific problematic combinations like Benfica-Auxerre
        const isRedWhiteConflict = 
          (homeRgb.r > 200 && homeRgb.g < 100 && homeRgb.b < 100 && 
           awayRgb.r > 180 && awayRgb.g > 180 && awayRgb.b > 180) ||
          (awayRgb.r > 200 && awayRgb.g < 100 && awayRgb.b < 100 && 
           homeRgb.r > 180 && homeRgb.g > 180 && homeRgb.b > 180);
        
        if (isRedWhiteConflict) {
          console.log(`⚠️ Red-White conflict detected between ${homeTeam} and ${awayTeam}`);
        }
      }
      
      // Determine best away team kit to use (may be away, third, or special)
      const awayKitType = getAwayTeamKit(homeTeam, awayTeam);
      setSelectedAwayKitType(awayKitType);
      
      const awayTeamKit = teamKitColors[awayTeam]?.[awayKitType];
      
      if (!awayTeamKit) {
        console.warn(`Away team ${awayTeam} kit colors not found`);
      } else {
        console.log(`Away team ${awayTeam} using ${awayKitType} kit:`, awayTeamKit.primary);
        
        // Show kit selection to user with more descriptive message
        let kitDescription = '';
        switch(awayKitType) {
          case 'away':
            kitDescription = 'away (secondary)';
            break;
          case 'third':
            kitDescription = 'third (alternative)';
            break;
          case 'special':
            kitDescription = 'special fourth kit';
            break;
          default:
            kitDescription = awayKitType;
        }
        
        toast.info(`Kit selection for ${awayTeam}`, {
          description: `Using ${kitDescription} kit to avoid color conflict with ${homeTeam}`,
          duration: 4000
        });
      }
      
      // Check for color conflicts between teams
      const conflictResult = checkTeamColorConflict(homeTeam, awayTeam);
      
      if (conflictResult.hasConflict) {
        // Generate an alternative kit if conflict detected
        const alternativeKit = generateAlternativeKit(homeTeam, awayTeam);
        
        if (awayKitType === 'special') {
          toast.info("Special kit needed", {
            description: `${awayTeam} will use a unique fourth kit to avoid severe color conflict with ${homeTeam}`,
            duration: 4000
          });
        }
        
        console.log(`Kit conflict detected between ${homeTeam} and ${awayTeam}`, conflictResult.conflictDetails);
        console.log(`Alternative kit generated:`, alternativeKit);
      }
      
      console.log(`=============================================`);
      setKitConflictChecked(true);
    }
  }, [activeMatch, kitConflictChecked]);

  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) return null;

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <TournamentMatch 
        homeTeam={activeMatch.teamA.name}
        awayTeam={activeMatch.teamB.name}
        onMatchComplete={onMatchComplete}
        matchDuration={60} // 60 real seconds match duration
        awayKitType={selectedAwayKitType} // Pass the selected kit type to TournamentMatch
      />
    </div>
  );
};

export default ActiveMatch;
