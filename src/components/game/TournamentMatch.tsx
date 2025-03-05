import React, { useState, useEffect, useMemo } from 'react';
import GameBoard from './GameBoard';
import usePlayerMovement from './PlayerMovement';
import MatchTimer from './MatchTimer';
import { Player, Ball, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { toast } from 'sonner';
import { getAwayTeamKit } from '../../types/kits';

interface TournamentMatchProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamElo?: number;
  awayTeamElo?: number; 
  onMatchComplete: (winner: string, finalScore: Score, wasGoldenGoal: boolean) => void;
  matchDuration?: number; // en segundos
}

const TournamentMatch: React.FC<TournamentMatchProps> = ({ 
  homeTeam, 
  awayTeam,
  homeTeamElo = 1700,
  awayTeamElo = 1700, 
  onMatchComplete,
  matchDuration = 180 // 3 minutos por defecto
}) => {
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
  const [gameStarted, setGameStarted] = useState(true);
  const [matchEnded, setMatchEnded] = useState(false);
  const [goldenGoal, setGoldenGoal] = useState(false);
  const [lastScorer, setLastScorer] = useState<'red' | 'blue' | null>(null);
  
  // Track goals during golden goal period
  const [goldenGoalScored, setGoldenGoalScored] = useState(false);
  
  // Calculate ELO bonuses for each team (slight advantages for teams with higher ELO)
  const homeTeamBonus = useMemo(() => {
    // Calculate a bonus based on ELO difference, but keep it small
    const eloDifference = homeTeamElo - awayTeamElo;
    // Convert to a small percentage (0.5% per 100 ELO points difference, max 5%)
    return Math.min(Math.max(eloDifference / 2000, 0), 0.05);
  }, [homeTeamElo, awayTeamElo]);

  const awayTeamBonus = useMemo(() => {
    // Calculate a bonus based on ELO difference, but keep it small
    const eloDifference = awayTeamElo - homeTeamElo;
    // Convert to a small percentage (0.5% per 100 ELO points difference, max 5%)
    return Math.min(Math.max(eloDifference / 2000, 0), 0.05);
  }, [homeTeamElo, awayTeamElo]);
  
  useEffect(() => {
    console.log('TournamentMatch: matchDuration =', matchDuration);
    console.log(`Team ELO ratings - ${homeTeam}: ${homeTeamElo} (bonus: ${(homeTeamBonus*100).toFixed(2)}%), ${awayTeam}: ${awayTeamElo} (bonus: ${(awayTeamBonus*100).toFixed(2)}%)`);
  }, [matchDuration, homeTeam, awayTeam, homeTeamElo, awayTeamElo, homeTeamBonus, awayTeamBonus]);
  
  const handleTimeEnd = useMemo(() => {
    return () => {
      console.log("Tiempo terminado. Puntuación:", score);
      
      if (score.red === score.blue) {
        console.log("Comenzando gol de oro");
        setGoldenGoal(true);
        toast("¡TIEMPO AGOTADO! - Comienza el tiempo de gol de oro", {
          description: "El primer equipo en marcar gana el partido"
        });
      } else {
        const winner = score.red > score.blue ? homeTeam : awayTeam;
        console.log("Partido terminado. Ganador:", winner);
        toast(`¡Fin del partido! ${winner} gana`, {
          description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
        });
        
        setTimeout(() => {
          setMatchEnded(true);
          onMatchComplete(winner, score, false);
        }, 2000);
      }
    };
  }, [score, homeTeam, awayTeam, onMatchComplete]);
  
  // Watch for score changes to detect goals
  useEffect(() => {
    // If we're in golden goal mode, any goal means game over!
    if (goldenGoal && !goldenGoalScored) {
      const totalGoals = score.red + score.blue;
      const initialTotalGoals = lastScorer ? totalGoals - 1 : totalGoals;
      
      if (totalGoals > initialTotalGoals) {
        // A goal was scored during golden goal time!
        setGoldenGoalScored(true);
        
        // Determine which team scored
        const scoringTeam = score.red > (lastScorer === 'red' ? score.red - 1 : score.red) ? 'red' : 'blue';
        const winner = scoringTeam === 'red' ? homeTeam : awayTeam;
        
        console.log("Golden goal winner:", winner);
        console.log("Final score (golden goal):", score);
        setLastScorer(scoringTeam);
        
        toast(`¡${winner} gana con gol de oro!`, {
          description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
        });
        
        setTimeout(() => {
          setMatchEnded(true);
          onMatchComplete(winner, score, true);
        }, 2000);
      }
    }
  }, [score, goldenGoal, homeTeam, awayTeam, onMatchComplete, lastScorer, goldenGoalScored]);
  
  useEffect(() => {
    if (players.length === 0 && homeTeam && awayTeam) {
      console.log("Initializing players for match:", homeTeam, "vs", awayTeam);
      initializePlayers();
    }
  }, [homeTeam, awayTeam, players.length]);
  
  const initializePlayers = () => {
    const newPlayers: Player[] = [];
    
    const awayTeamKitType = getAwayTeamKit(homeTeam, awayTeam);
    console.log(`Tournament match: ${homeTeam} (home) vs ${awayTeam} (${awayTeamKitType})`);
    
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
      
      // Apply the ELO bonus to the movement speed (subtle but meaningful)
      // A team with higher ELO will have slightly faster players
      const speedMultiplier = 1 + homeTeamBonus;
      
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
        // Add a speedMultiplier property based on ELO rating
        speedMultiplier
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
      
      // Apply the ELO bonus to the movement speed
      const speedMultiplier = 1 + awayTeamBonus;
      
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
        // Add a speedMultiplier property based on ELO rating
        speedMultiplier
      });
    }
    
    setPlayers(newPlayers);
  };
  
  const { updatePlayerPositions } = usePlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady: true 
  });
  
  if (matchEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Partido finalizado</h2>
        <div className="text-xl">
          {homeTeam} {score.red} - {score.blue} {awayTeam}
        </div>
        <div className="mt-4 text-lg font-semibold">
          Ganador: {score.red > score.blue ? homeTeam : awayTeam}
          {goldenGoalScored && <span className="ml-2 text-amber-500">(Gol de Oro)</span>}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative mt-12 pt-8"> {/* Espacio para el temporizador */}
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
        setScore={setScore}
        updatePlayerPositions={updatePlayerPositions}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </div>
  );
};

export default TournamentMatch;
