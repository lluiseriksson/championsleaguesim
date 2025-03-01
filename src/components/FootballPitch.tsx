import React from 'react';
import PitchLayout from './PitchLayout';
import ScoreDisplay from './ScoreDisplay';
import Ball from './Ball';
import PlayerSprite from './PlayerSprite';
import GameLogic from './GameLogic';
import { createPlayerBrain, moveGoalkeeper } from '../utils/playerBrain';
import {
  Player, Ball as BallType, Score, PITCH_WIDTH, PITCH_HEIGHT
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
        // LÓGICA ESPECÍFICA PARA PORTEROS
        if (player.role === 'goalkeeper') {
          // Usar algoritmo directo para porteros
          const movement = moveGoalkeeper(player, ball);
          
          // Calcular nueva posición con el algoritmo directo
          const newPosition = {
            x: player.position.x + movement.x,
            y: player.position.y + movement.y
          };
          
          // Asegurar que se mantiene dentro de los límites del campo
          newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
          newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
          
          console.log(`Portero ${player.team} #${player.id} - Posición actualizada:`, {
            anterior: player.position,
            nueva: newPosition,
            movimiento: movement
          });
          
          return {
            ...player,
            position: newPosition,
            brain: {
              ...player.brain,
              lastOutput: movement,
              lastAction: 'move'
            }
          };
        }
        
        // LÓGICA PARA JUGADORES NO PORTEROS (SIN CAMBIOS)
        const input = {
          ballX: ball.position.x / PITCH_WIDTH,
          ballY: ball.position.y / PITCH_HEIGHT,
          playerX: player.position.x / PITCH_WIDTH,
          playerY: player.position.y / PITCH_HEIGHT,
        };

        const output = player.brain.net.run(input);
        player.brain.lastOutput = { 
          x: (output.moveX || 0.5) * 2 - 1, 
          y: (output.moveY || 0.5) * 2 - 1 
        };

        let maxDistance = 50;
        const distanceToBall = Math.sqrt(
          Math.pow(ball.position.x - player.position.x, 2) +
          Math.pow(ball.position.y - player.position.y, 2)
        );

        switch (player.role) {
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

        const newPosition = {
          x: player.position.x + player.brain.lastOutput.x * 2,
          y: player.position.y + player.brain.lastOutput.y * 2,
        };

        const distanceFromStart = Math.sqrt(
          Math.pow(newPosition.x - player.targetPosition.x, 2) +
          Math.pow(newPosition.y - player.targetPosition.y, 2)
        );

        if (distanceFromStart > maxDistance) {
          const angle = Math.atan2(
            player.targetPosition.y - newPosition.y,
            player.targetPosition.x - newPosition.x
          );
          newPosition.x = player.targetPosition.x + Math.cos(angle) * maxDistance;
          newPosition.y = player.targetPosition.y + Math.sin(angle) * maxDistance;
        }

        newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
        newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));

        return {
          ...player,
          position: newPosition,
        };
      })
    );
  }, [ball.position]);

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
