
import React from 'react';
import PitchLayout from './PitchLayout';
import ScoreDisplay from './ScoreDisplay';
import Ball from './Ball';
import PlayerSprite from './PlayerSprite';
import GameLogic from './GameLogic';
import { createPlayerBrain, updatePlayerBrain } from '../utils/playerBrain';
import {
  Player, Ball as BallType, Score, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT
} from '../types/football';

const FootballPitch: React.FC = () => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [ball, setBall] = React.useState<BallType>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: 2, y: 2 },
  });
  const [score, setScore] = React.useState<Score>({ red: 0, blue: 0 });

  React.useEffect(() => {
    const initialPlayers: Player[] = [];
    
    [
      { x: 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
      { x: 150, y: PITCH_HEIGHT/4, role: 'defender' },
      { x: 150, y: PITCH_HEIGHT/2, role: 'defender' },
      { x: 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
      { x: 300, y: PITCH_HEIGHT/3, role: 'midfielder' },
      { x: 300, y: PITCH_HEIGHT/2, role: 'midfielder' },
      { x: 300, y: (PITCH_HEIGHT*2)/3, role: 'midfielder' },
      { x: 500, y: PITCH_HEIGHT/4, role: 'forward' },
      { x: 500, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
    ].forEach((pos, index) => {
      initialPlayers.push({
        id: index + 1,
        position: { x: pos.x, y: pos.y },
        role: pos.role as Player['role'],
        team: 'red',
        brain: createPlayerBrain(),
        targetPosition: { x: pos.x, y: pos.y }
      });
    });

    [
      { x: PITCH_WIDTH - 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
      { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/4, role: 'defender' },
      { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/2, role: 'defender' },
      { x: PITCH_WIDTH - 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
      { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/3, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/2, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*2)/3, role: 'midfielder' },
      { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/4, role: 'forward' },
      { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: PITCH_WIDTH - 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
    ].forEach((pos, index) => {
      initialPlayers.push({
        id: index + 11,
        position: { x: pos.x, y: pos.y },
        role: pos.role as Player['role'],
        team: 'blue',
        brain: createPlayerBrain(),
        targetPosition: { x: pos.x, y: pos.y }
      });
    });

    setPlayers(initialPlayers);
  }, []);

  const updatePlayerPositions = React.useCallback(() => {
    setPlayers(currentPlayers => 
      currentPlayers.map(player => {
        // Obtener el contexto del equipo
        const getTeamContext = (player: Player) => ({
          teammates: currentPlayers.filter(p => p.team === player.team && p.id !== player.id).map(p => p.position),
          opponents: currentPlayers.filter(p => p.team !== player.team).map(p => p.position),
          ownGoal: player.team === 'red' ? { x: 0, y: PITCH_HEIGHT/2 } : { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 },
          opponentGoal: player.team === 'red' ? { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 } : { x: 0, y: PITCH_HEIGHT/2 }
        });
        
        // AHORA TODOS LOS JUGADORES USAN RED NEURONAL
        // Los porteros tienen un procesamiento especial en updatePlayerBrain
        const updatedBrain = updatePlayerBrain(
          player.brain,
          false, // No está marcando gol ahora
          ball,
          player,
          getTeamContext(player)
        );
        
        // Calcular distancia máxima según el rol
        let maxDistance = 50;
        const distanceToBall = Math.sqrt(
          Math.pow(ball.position.x - player.position.x, 2) +
          Math.pow(ball.position.y - player.position.y, 2)
        );

        switch (player.role) {
          case 'goalkeeper':
            maxDistance = 70; // Permitir más movimiento al portero, pero limitado
            break;
          case 'defender':
            maxDistance = distanceToBall < 150 ? 96 : 60;
            break;
          case 'midfielder':
            maxDistance = distanceToBall < 200 ? 120 : 80;
            break;
          case 'forward':
            maxDistance = distanceToBall < 250 ? 200 : 120;
            break;
        }

        // Calcular nueva posición con el resultado de la red
        const newPosition = {
          x: player.position.x + updatedBrain.lastOutput.x,
          y: player.position.y + updatedBrain.lastOutput.y,
        };

        // Limitar distancia desde la posición inicial
        const distanceFromStart = Math.sqrt(
          Math.pow(newPosition.x - player.targetPosition.x, 2) +
          Math.pow(newPosition.y - player.targetPosition.y, 2)
        );

        // Si es portero, aplicar restricciones especiales de posición
        if (player.role === 'goalkeeper') {
          // Restringir X para mantener al portero cerca de su portería
          const fixedX = player.team === 'red' ? 40 : PITCH_WIDTH - 40;
          // Permitir una variación pequeña en X
          const maxXVariation = 30;
          
          if (Math.abs(newPosition.x - fixedX) > maxXVariation) {
            newPosition.x = fixedX + (Math.sign(newPosition.x - fixedX) * maxXVariation);
          }
          
          // Limitar Y para mantenerse dentro del área de portería con margen
          const goalCenterY = PITCH_HEIGHT / 2;
          const maxYVariation = GOAL_HEIGHT / 2 + 20;
          
          if (Math.abs(newPosition.y - goalCenterY) > maxYVariation) {
            newPosition.y = goalCenterY + (Math.sign(newPosition.y - goalCenterY) * maxYVariation);
          }
        } 
        // Para otros jugadores, aplicar límite de distancia estándar
        else if (distanceFromStart > maxDistance) {
          const angle = Math.atan2(
            newPosition.y - player.targetPosition.y,
            newPosition.x - player.targetPosition.x
          );
          newPosition.x = player.targetPosition.x + Math.cos(angle) * maxDistance;
          newPosition.y = player.targetPosition.y + Math.sin(angle) * maxDistance;
        }

        // Asegurar que se mantiene dentro de los límites del campo
        newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
        newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
        
        if (player.role === 'goalkeeper') {
          console.log(`Portero ${player.team} #${player.id} (IA) - Posición final:`, {
            anterior: player.position,
            nueva: newPosition,
            movimiento: {
              x: newPosition.x - player.position.x,
              y: newPosition.y - player.position.y
            }
          });
        }
        
        return {
          ...player,
          position: newPosition,
          brain: updatedBrain
        };
      })
    );
  }, [ball]);

  return (
    <div className="relative w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg">
      <ScoreDisplay score={score} />
      <PitchLayout />

      {players.map((player) => (
        <PlayerSprite key={player.id} player={player} />
      ))}

      <Ball ball={ball} />

      <GameLogic
        players={players}
        setPlayers={setPlayers}
        ball={ball}
        setBall={setBall}
        score={score}
        setScore={setScore}
        updatePlayerPositions={updatePlayerPositions}
      />
    </div>
  );
};

export default FootballPitch;
