import React, { useState, useEffect, useMemo, useRef } from 'react';
import GameBoard from './GameBoard';
import usePlayerMovement from './PlayerMovement';
import MatchTimer from './MatchTimer';
import { Player, Ball, Score, PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS } from '../../types/football';
import { toast } from 'sonner';
import { getAwayTeamKit } from '../../types/kits';
import { performFinalKitCheck, resolveKitConflict } from '../../types/kits/kitConflictChecker';
import GameLogic from '../GameLogic';

const transliterateRussianName = (name: string): string => {
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

  if (name === 'Ολυμπιακός') return 'Olympiakos';

  const hasCyrillic = /[А-Яа-яЁё]/.test(name);
  
  if (!hasCyrillic) return name;
  
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    result += cyrillicToLatin[char] || char;
  }
  
  return result;
};

interface TournamentMatchProps {
  homeTeam: string;
  awayTeam: string;
  onMatchComplete: (winner: string, finalScore: Score, wasGoldenGoal: boolean) => void;
  matchDuration?: number; // in seconds
}

const TournamentMatch: React.FC<TournamentMatchProps> = ({ 
  homeTeam, 
  awayTeam, 
  onMatchComplete,
  matchDuration = 60 // 1 minute default (changed from 120)
}) => {
  const displayHomeTeam = transliterateRussianName(homeTeam);
  const displayAwayTeam = transliterateRussianName(awayTeam);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [ball, setBall] = useState<Ball>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: Math.random() > 0.5 ? 3 : -3, y: (Math.random() - 0.5) * 3 },
    bounceDetection: {
      consecutiveBounces: 0,
      lastBounceTime: 0,
      lastBounceSide: '',
      sideEffect: false
    }
  });
  
  const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [goldenGoal, setGoldenGoal] = useState(false);
  const [lastScorer, setLastScorer] = useState<'red' | 'blue' | null>(null);
  const [goldenGoalScored, setGoldenGoalScored] = useState(false);
  
  const [kitConflictResolved, setKitConflictResolved] = useState(false);
  
  const resultDeterminedRef = useRef(false);
  
  useEffect(() => {
    if (!kitConflictResolved && homeTeam && awayTeam) {
      console.log(`Checking kit conflicts between ${homeTeam} and ${awayTeam}`);
      
      let awayTeamKitType = getAwayTeamKit(homeTeam, awayTeam);
      
      const kitCheckPassed = performFinalKitCheck(homeTeam, awayTeam, awayTeamKitType);
      
      if (!kitCheckPassed) {
        console.warn(`Kit conflict detected between ${homeTeam} and ${awayTeam}. Resolving...`);
        awayTeamKitType = resolveKitConflict(homeTeam, awayTeam);
        
        toast.success(`Kit conflict resolved`, {
          description: `${awayTeam} will use their ${awayTeamKitType} kit to avoid color clash with ${homeTeam}`
        });
      }
      
      setKitConflictResolved(true);
      
      initializePlayers(awayTeamKitType);
      
      setTimeout(() => {
        setGameStarted(true);
      }, 1000);
    }
  }, [homeTeam, awayTeam, kitConflictResolved]);
  
  useEffect(() => {
    console.log('TournamentMatch: matchDuration =', matchDuration);
  }, [matchDuration]);
  
  const handleTimeEnd = useMemo(() => {
    return () => {
      console.log("Time ended. Score:", score);
      
      if (score.red === score.blue) {
        console.log("Starting golden goal time");
        setGoldenGoal(true);
        setLastScorer(null);
        toast("TIME'S UP! - Golden goal period begins", {
          description: "First team to score wins the match"
        });
      } else {
        const winner = score.red > score.blue ? homeTeam : awayTeam;
        const displayWinner = transliterateRussianName(winner);
        console.log("Match ended. Winner:", displayWinner);
        toast(`Match finished! ${displayWinner} wins`, {
          description: `Final score: ${displayHomeTeam} ${score.red} - ${score.blue} ${displayAwayTeam}`,
        });
        
        resultDeterminedRef.current = true;
        
        setTimeout(() => {
          setMatchEnded(true);
          onMatchComplete(winner, score, false);
        }, 2000);
      }
    };
  }, [score, homeTeam, awayTeam, onMatchComplete, displayHomeTeam, displayAwayTeam]);
  
  useEffect(() => {
    if (goldenGoal && !goldenGoalScored) {
      if (lastScorer) {
        console.log("Golden goal scored by:", lastScorer);
        setGoldenGoalScored(true);
        const winner = lastScorer === 'red' ? homeTeam : awayTeam;
        const displayWinner = transliterateRussianName(winner);
        
        console.log("Golden goal winner:", displayWinner);
        toast(`${displayWinner} wins with a golden goal!`, {
          description: `Final score: ${displayHomeTeam} ${score.red} - ${score.blue} ${displayAwayTeam}`,
        });
        
        resultDeterminedRef.current = true;
        
        setTimeout(() => {
          setMatchEnded(true);
          onMatchComplete(winner, score, true);
        }, 2000);
      }
    }
  }, [goldenGoal, lastScorer, score, homeTeam, awayTeam, onMatchComplete, goldenGoalScored, displayHomeTeam, displayAwayTeam]);
  
  const initializePlayers = (awayTeamKitType: KitType) => {
    const newPlayers: Player[] = [];
    
    console.log(`Tournament match: ${displayHomeTeam} (home) vs ${displayAwayTeam} (${awayTeamKitType})`);
    
    const redTeamPositions = [
      { x: 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
      { x: 150, y: PITCH_HEIGHT/4, role: 'defender' },
      { x: 150, y: PITCH_HEIGHT/2, role: 'defender' },
      { x: 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
      { x: 300, y: PITCH_HEIGHT/5, role: 'midfielder' },
      { x: 300, y: (PITCH_HEIGHT*2)/5, role: 'midfielder' },
      { x: 300, y: (PITCH_HEIGHT*3)/5, role: 'midfielder' },
      { x: 300, y: (PITCH_HEIGHT*4)/5, role: 'midfielder' },
      { x: 500, y: PITCH_HEIGHT/4, role: 'forward' },
      { x: 500, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
    ];
    
    for (let i = 0; i < redTeamPositions.length; i++) {
      const pos = redTeamPositions[i];
      const role = pos.role as Player['role'];
      
      newPlayers.push({
        id: i + 1,
        position: { x: pos.x, y: pos.y },
        role: role,
        team: 'red',
        brain: {
          net: null as any,
          lastOutput: { x: 0, y: 0 },
          lastAction: 'move'
        },
        targetPosition: { x: pos.x, y: pos.y },
        teamName: homeTeam,
        kitType: 'home',
        radius: PLAYER_RADIUS
      });
    }
    
    const blueTeamPositions = [
      { x: PITCH_WIDTH - 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
      { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/4, role: 'defender' },
      { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/2, role: 'defender' },
      { x: PITCH_WIDTH - 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
      { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/5, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*2)/5, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*3)/5, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*4)/5, role: 'midfielder' },
      { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/4, role: 'forward' },
      { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: PITCH_WIDTH - 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
    ];
    
    for (let i = 0; i < blueTeamPositions.length; i++) {
      const pos = blueTeamPositions[i];
      const role = pos.role as Player['role'];
      
      newPlayers.push({
        id: i + 12,
        position: { x: pos.x, y: pos.y },
        role: role,
        team: 'blue',
        brain: {
          net: null as any,
          lastOutput: { x: 0, y: 0 },
          lastAction: 'move'
        },
        targetPosition: { x: pos.x, y: pos.y },
        teamName: awayTeam,
        kitType: awayTeamKitType,
        radius: PLAYER_RADIUS
      });
    }
    
    setPlayers(newPlayers);
  };
  
  const { updatePlayerPositions } = usePlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady: gameStarted 
  });
  
  const handleGoalScored = (team: 'red' | 'blue') => {
    console.log(`Goal scored by ${team} team, golden goal mode: ${goldenGoal}`);
    setLastScorer(team);
  };
  
  if (matchEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Match finished</h2>
        <div className="text-xl">
          {displayHomeTeam} {score.red} - {score.blue} {displayAwayTeam}
        </div>
        <div className="mt-4 text-lg font-semibold">
          Winner: {score.red > score.blue ? displayHomeTeam : displayAwayTeam}
          {goldenGoalScored && <span className="ml-2 text-amber-500">(Golden Goal)</span>}
        </div>
      </div>
    );
  }
  
  if (!gameStarted) {
    return (
      <div className="relative mt-12 pt-8">
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Preparing Match</h2>
          <div className="text-xl mb-4">
            {displayHomeTeam} vs {displayAwayTeam}
          </div>
          <div className="animate-pulse text-sm text-gray-600">
            Resolving kit conflicts and preparing teams...
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative mt-12 pt-8">
      <MatchTimer 
        initialTime={matchDuration} 
        onTimeEnd={handleTimeEnd}
        goldenGoal={goldenGoal}
      />
      
      <GameBoard
        players={players}
        setPlayers={setPlayers}
        ball={ball}
        setBall={setBall}
        score={score}
        setScore={(newScore) => {
          if (resultDeterminedRef.current) {
            console.log("Ignoring late goal - match result already determined");
            return;
          }
          
          const currentScore = typeof newScore === 'function' 
            ? (newScore as (prev: Score) => Score)(score)
            : newScore;
            
          if (currentScore.red > score.red) {
            handleGoalScored('red');
          } else if (currentScore.blue > score.blue) {
            handleGoalScored('blue');
          }
          setScore(currentScore);
        }}
        updatePlayerPositions={updatePlayerPositions}
        tournamentMode={true}
        onGoalScored={handleGoalScored}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </div>
  );
};

export default TournamentMatch;
