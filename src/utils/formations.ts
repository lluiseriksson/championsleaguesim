import { Position, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

export type FormationType = '3-4-3' | '4-4-2' | '4-3-3' | '5-3-2';

interface FormationPosition {
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  relativeX: number; // 0-1 relative to field width
  relativeY: number; // 0-1 relative to field height
}

// Define formation positions for both attacking and defending scenarios
export interface Formation {
  name: FormationType;
  positions: FormationPosition[];
  // How compact/expanded the formation should be in different scenarios
  compactness: {
    defending: number; // 0-1, lower is more compact
    neutral: number;   // middle ground
    attacking: number; // higher is more expanded
  };
  // How high/low the formation's defensive line should be
  defensiveLine: {
    deep: number;      // 0-1, lower means deeper defense
    medium: number;    // middle ground
    high: number;      // higher means higher press
  };
}

// 3-4-3 Formation
export const formation343: Formation = {
  name: '3-4-3',
  positions: [
    // Goalkeeper
    { role: 'goalkeeper', relativeX: 0.05, relativeY: 0.5 },
    
    // Defenders (3)
    { role: 'defender', relativeX: 0.15, relativeY: 0.25 },
    { role: 'defender', relativeX: 0.15, relativeY: 0.5 },
    { role: 'defender', relativeX: 0.15, relativeY: 0.75 },
    
    // Midfielders (4)
    { role: 'midfielder', relativeX: 0.35, relativeY: 0.2 },
    { role: 'midfielder', relativeX: 0.35, relativeY: 0.4 },
    { role: 'midfielder', relativeX: 0.35, relativeY: 0.6 },
    { role: 'midfielder', relativeX: 0.35, relativeY: 0.8 },
    
    // Forwards (3)
    { role: 'forward', relativeX: 0.65, relativeY: 0.25 },
    { role: 'forward', relativeX: 0.65, relativeY: 0.5 },
    { role: 'forward', relativeX: 0.65, relativeY: 0.75 },
  ],
  compactness: {
    defending: 0.3,
    neutral: 0.5,
    attacking: 0.7
  },
  defensiveLine: {
    deep: 0.2,
    medium: 0.35,
    high: 0.5
  }
};

// Default formations by team name
export const teamFormations: Record<string, FormationType> = {
  // Default to 3-4-3 for all teams for now
  'Real Madrid': '3-4-3',
  'Barcelona': '3-4-3',
  'Bayern Munich': '3-4-3',
  'Manchester United': '3-4-3',
  'Liverpool': '3-4-3',
  'Chelsea': '3-4-3',
  'Manchester City': '3-4-3',
  'PSG': '3-4-3',
  'Juventus': '3-4-3',
  'AC Milan': '3-4-3',
  'Inter Milan': '3-4-3',
  'Ajax': '3-4-3',
  'Borussia Dortmund': '3-4-3',
  'Atletico Madrid': '3-4-3',
  'Arsenal': '3-4-3',
  'Tottenham': '3-4-3',
  'Roma': '3-4-3',
  'Napoli': '3-4-3',
  'Sevilla': '3-4-3',
  'Olympiakos': '3-4-3',
  'Зенит': '3-4-3',
  'ЦСКА': '3-4-3',
  'Локомотив': '3-4-3'
};

// Get formation by name
export const getFormation = (formationName: FormationType): Formation => {
  switch (formationName) {
    case '3-4-3':
      return formation343;
    // Add other formations here when needed
    default:
      return formation343;
  }
};

// Calculate actual positions based on team side and context
export const calculateFormationPositions = (
  formation: Formation,
  teamSide: 'red' | 'blue',
  ballPosition: Position,
  hasPossession: boolean,
  scoreDifferential: number
): Position[] => {
  // Determine if team is attacking or defending
  const isAttacking = hasPossession;
  const isDefending = !hasPossession;
  
  // Adjust compactness based on game state
  let compactness = formation.compactness.neutral;
  let defensiveLineHeight = formation.defensiveLine.medium;
  
  if (isAttacking) {
    compactness = formation.compactness.attacking;
    // Push higher when attacking
    defensiveLineHeight = formation.defensiveLine.high;
  } else if (isDefending) {
    compactness = formation.compactness.defending;
    // Drop deeper when defending
    defensiveLineHeight = formation.defensiveLine.deep;
  }
  
  // If winning by 2+ goals, be more defensive
  if (scoreDifferential >= 2) {
    compactness *= 0.8; // More compact
    defensiveLineHeight *= 0.85; // Deeper defense
  }
  // If losing by 2+ goals, be more attacking
  else if (scoreDifferential <= -2) {
    compactness *= 1.2; // More expanded
    defensiveLineHeight *= 1.15; // Higher line
  }
  
  // Ball attraction factor - positions shift slightly toward ball's horizontal position
  const ballAttractionX = ballPosition.x / PITCH_WIDTH;
  const ballAttractionY = ballPosition.y / PITCH_HEIGHT;
  const ballAttractionFactor = 0.1; // How much positions are influenced by ball
  
  return formation.positions.map(pos => {
    // Flip coordinates for blue team (right to left)
    const baseX = teamSide === 'red' 
      ? pos.relativeX 
      : 1 - pos.relativeX;
    
    // Apply compactness to X coordinate (compressing or expanding formation)
    let adjustedX = baseX;
    
    // For red team, compress towards own goal (left), for blue team compress towards own goal (right)
    if (teamSide === 'red') {
      // Red team compresses towards left
      adjustedX = baseX * compactness;
      // Apply defensive line height adjustment
      adjustedX = Math.max(pos.role === 'goalkeeper' ? 0.05 : 0.1, adjustedX * defensiveLineHeight);
    } else {
      // Blue team compresses towards right
      adjustedX = 1 - ((1 - baseX) * compactness);
      // Apply defensive line height adjustment (flipped for blue team)
      adjustedX = Math.min(pos.role === 'goalkeeper' ? 0.95 : 0.9, 
                          1 - ((1 - adjustedX) * defensiveLineHeight));
    }
    
    // Apply ball attraction to pull positions slightly toward ball's horizontal position
    adjustedX = adjustedX * (1 - ballAttractionFactor) + 
                (teamSide === 'red' ? ballAttractionX * ballAttractionFactor : 
                                     (1 - ballAttractionX) * ballAttractionFactor);
    
    // Apply ball attraction to Y position
    const adjustedY = pos.relativeY * (1 - ballAttractionFactor) + 
                      ballAttractionY * ballAttractionFactor;
    
    // Convert to pitch coordinates
    return {
      x: adjustedX * PITCH_WIDTH,
      y: adjustedY * PITCH_HEIGHT
    };
  });
};
