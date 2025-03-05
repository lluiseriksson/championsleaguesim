
import React, { useState, useEffect } from 'react';
import GameBoard from './GameBoard';
import usePlayerMovement from './PlayerMovement';
import MatchTimer from './MatchTimer';
import { Player, Ball, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { Button } from '../ui/button';
import { getTeamKitColor } from '../../types/teamKits';
import { toast } from 'sonner';

interface TournamentMatchProps {
  homeTeam: string;
  awayTeam: string;
  onMatchComplete: (winner: string) => void;
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
  const [gameStarted, setGameStarted] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [goldenGoal, setGoldenGoal] = useState(false);
  const [lastScorer, setLastScorer] = useState<'red' | 'blue' | null>(null);
  
  // Escuchar cambios en la puntuación para detectar goles
  useEffect(() => {
    const totalGoals = score.red + score.blue;
    
    // Si estamos en modo gol de oro y se marca un gol, terminar el partido
    if (goldenGoal && totalGoals > 0) {
      const winner = score.red > score.blue ? homeTeam : awayTeam;
      setLastScorer(score.red > score.blue ? 'red' : 'blue');
      
      toast(`¡${winner} gana con gol de oro!`, {
        description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
      });
      
      setTimeout(() => {
        setMatchEnded(true);
        onMatchComplete(winner);
      }, 2000);
    }
  }, [score, goldenGoal, homeTeam, awayTeam, onMatchComplete]);
  
  // Inicializar jugadores
  useEffect(() => {
    if (players.length === 0 && homeTeam && awayTeam) {
      // Crear jugadores basados en equipos del torneo
      initializePlayers();
    }
  }, [homeTeam, awayTeam]);
  
  const initializePlayers = () => {
    const newPlayers: Player[] = [];
    
    // Posiciones para equipo rojo (home)
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
    
    // Posiciones para equipo azul (away)
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
        kitType: 'away'
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
  
  const handleMatchStart = () => {
    setGameStarted(true);
    toast(`¡Comienza el partido entre ${homeTeam} y ${awayTeam}!`, {
      description: "Duración del partido: 3 minutos"
    });
  };
  
  const handleTimeEnd = () => {
    // Si hay empate, activar modo gol de oro
    if (score.red === score.blue) {
      setGoldenGoal(true);
      toast("¡TIEMPO AGOTADO! - Comienza el tiempo de gol de oro", {
        description: "El primer equipo en marcar gana el partido"
      });
    } else {
      // Si hay un ganador, terminar el partido
      const winner = score.red > score.blue ? homeTeam : awayTeam;
      toast(`¡Fin del partido! ${winner} gana`, {
        description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
      });
      
      setTimeout(() => {
        setMatchEnded(true);
        onMatchComplete(winner);
      }, 2000);
    }
  };
  
  if (matchEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Partido finalizado</h2>
        <div className="text-xl">
          {homeTeam} {score.red} - {score.blue} {awayTeam}
        </div>
        <div className="mt-4 text-lg font-semibold">
          Ganador: {score.red > score.blue ? homeTeam : awayTeam}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {!gameStarted ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-20 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-6">Partido de Torneo</h2>
          <div className="flex items-center space-x-4 mb-8">
            <span className="text-xl font-bold text-white">{homeTeam}</span>
            <span className="text-white">vs</span>
            <span className="text-xl font-bold text-white">{awayTeam}</span>
          </div>
          <Button 
            onClick={handleMatchStart}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
          >
            Iniciar Partido
          </Button>
        </div>
      ) : (
        <MatchTimer 
          initialTime={matchDuration} 
          isRunning={gameStarted && !matchEnded} 
          onTimeEnd={handleTimeEnd}
          goldenGoal={goldenGoal}
        />
      )}
      
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
