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
  const [gameReady, setGameReady] = React.useState(false);

  React.useEffect(() => {
    try {
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
        const brain = createPlayerBrain();
        initialPlayers.push({
          id: index + 1,
          position: { x: pos.x, y: pos.y },
          role: pos.role as Player['role'],
          team: 'red',
          brain: brain,
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
        const brain = createPlayerBrain();
        initialPlayers.push({
          id: index + 11,
          position: { x: pos.x, y: pos.y },
          role: pos.role as Player['role'],
          team: 'blue',
          brain: brain,
          targetPosition: { x: pos.x, y: pos.y }
        });
      });

      setPlayers(initialPlayers);
      setGameReady(true);
      console.log("Game initialized successfully with", initialPlayers.length, "players");
    } catch (error) {
      console.error("Error initializing game:", error);
    }
  }, []);

  const updatePlayerPositions = React.useCallback(() => {
    if (!gameReady) return;
    
    setPlayers(currentPlayers => 
      currentPlayers.map(player => {
        try {
          if (player.role === 'goalkeeper') {
            const movement = moveGoalkeeper(player, ball);
            const newPosition = {
              x: player.position.x + movement.x,
              y: player.position.y + movement.y
            };
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
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
          
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.warn(`Invalid brain for ${player.team} ${player.role} #${player.id}, using fallback movement`);
            const dx = ball.position.x - player.position.x;
            const dy = ball.position.y - player.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = 1.5;
            const moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
            const moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
            
            const newPosition = {
              x: player.position.x + moveX,
              y: player.position.y + moveY
            };
            
            let maxDistance = 50;
            switch (player.role) {
              case 'defender': maxDistance = 70; break;
              case 'midfielder': maxDistance = 100; break;
              case 'forward': maxDistance = 120; break;
            }
            
            const distanceFromStart = Math.sqrt(
              Math.pow(newPosition.x - player.targetPosition.x, 2) +
              Math.pow(newPosition.y - player.targetPosition.y, 2)
            );
            
            if (distanceFromStart > maxDistance) {
              const angle = Math.atan2(
                player.targetPosition.y - newPosition.y,
                player.targetPosition.x - newPosition.x
              );
              newPosition.x = player.targetPosition.x - Math.cos(angle) * maxDistance;
              newPosition.y = player.targetPosition.y - Math.sin(angle) * maxDistance;
            }
            
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            
            return {
              ...player,
              position: newPosition,
              brain: {
                ...player.brain,
                lastOutput: { x: moveX, y: moveY },
                lastAction: 'move'
              }
            };
          }
          
          const input = {
            ballX: ball.position.x / PITCH_WIDTH,
            ballY: ball.position.y / PITCH_HEIGHT,
            playerX: player.position.x / PITCH_WIDTH,
            playerY: player.position.y / PITCH_HEIGHT,
            ballVelocityX: ball.velocity.x / 20,
            ballVelocityY: ball.velocity.y / 20,
            distanceToGoal: 0.5,
            angleToGoal: 0,
            nearestTeammateDistance: 0.5,
            nearestTeammateAngle: 0,
            nearestOpponentDistance: 0.5,
            nearestOpponentAngle: 0,
            isInShootingRange: 0,
            isInPassingRange: 0,
            isDefendingRequired: 0
          };

          const output = player.brain.net.run(input);
          const moveX = (output.moveX || 0.5) * 2 - 1;
          const moveY = (output.moveY || 0.5) * 2 - 1;
          
          player.brain.lastOutput = { x: moveX, y: moveY };

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
            x: player.position.x + moveX * 2,
            y: player.position.y + moveY * 2,
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
        } catch (error) {
          console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
          return player;
        }
      })
    );
  }, [ball, gameReady]);

  if (!gameReady) {
    return (
      <div className="w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

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
