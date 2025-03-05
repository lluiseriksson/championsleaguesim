import React, { useState, useEffect, useMemo } from 'react';
import GameBoard from './GameBoard';
import usePlayerMovement from './PlayerMovement';
import MatchTimer from './MatchTimer';
import { Player, Ball, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { toast } from 'sonner';
import { getAwayTeamKit } from '../../types/teamKits';

interface TournamentMatchProps {
  homeTeam: string;
  awayTeam: string;
  onMatchComplete: (winner: string, finalScore: Score) => void;
  matchDuration?: number; // en segundos
}

const TournamentMatch: React.FC<TournamentMatchProps> = ({ 
  homeTeam, 
  awayTeam, 
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
  
  useEffect(() => {
    console.log('TournamentMatch: matchDuration =', matchDuration);
  }, [matchDuration]);
  
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
          onMatchComplete(winner, score);
        }, 2000);
      }
    };
  }, [score, homeTeam, awayTeam, onMatchComplete]);
  
  useEffect(() => {
    const totalGoals = score.red + score.blue;
    const previousTotalGoals = lastScorer ? 1 : 0;
    
    if (goldenGoal && totalGoals > previousTotalGoals) {
      const winner = score.red > score.blue ? homeTeam : awayTeam;
      setLastScorer(score.red > score.blue ? 'red' : 'blue');
      
      console.log("Golden goal winner:", winner);
      console.log("Final score (including golden goal):", score);
      
      toast(`¡${winner} gana con gol de oro!`, {
        description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
      });
      
      setTimeout(() => {
        setMatchEnded(true);
        onMatchComplete(winner, score);
      }, 2000);
    }
  }, [score, goldenGoal, homeTeam, awayTeam, onMatchComplete, lastScorer]);
  
  useEffect(() => {
    if (players.length === 0 && homeTeam && awayTeam) {
      console.log("Initializing players for match:", homeTeam, "vs", awayTeam);
      initializePlayers();
    }
  }, [homeTeam, awayTeam, players.length]);
  
  const initializePlayers = () => {
    const newPlayers: Player[] = [];
    
    const awayTeamKitType = getAwayTeamKit(homeTeam, awayTeam);
    
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
        kitType: 'home'
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
        kitType: awayTeamKitType
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
          {lastScorer && <span className="ml-2 text-amber-500">(Gol de Oro)</span>}
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
