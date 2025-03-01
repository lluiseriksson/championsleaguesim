
import React from 'react';
import { Player, Ball, Score, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, PLAYER_RADIUS, GOAL_HEIGHT } from '../types/football';
import { checkCollision, calculateNewVelocity } from '../utils/gamePhysics';
import { updatePlayerBrain } from '../utils/brainTraining';
import { syncAllPlayers } from '../utils/modelLoader';
import { saveModel } from '../utils/neuralModelService';

interface GameLogicProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  score: Score;
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  updatePlayerPositions: () => void;
}

const GameLogic: React.FC<GameLogicProps> = ({
  players,
  setPlayers,
  ball,
  setBall,
  score,
  setScore,
  updatePlayerPositions,
}) => {
  // Contador para controlar la sincronización periódica
  const syncCounterRef = React.useRef(0);
  // Tiempo de la última sincronización
  const lastSyncTimeRef = React.useRef(Date.now());
  // Referencia a los jugadores para acceder en useEffect
  const playersRef = React.useRef(players);
  // Referencia para rastrear el último jugador que tocó el balón
  const lastPlayerTouchRef = React.useRef<Player | null>(null);

  React.useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Memoizar el contexto del equipo para evitar recálculos innecesarios
  const getTeamContext = React.useCallback((player: Player) => ({
    teammates: players.filter(p => p.team === player.team && p.id !== player.id).map(p => p.position),
    opponents: players.filter(p => p.team !== player.team).map(p => p.position),
    ownGoal: player.team === 'red' ? { x: 0, y: PITCH_HEIGHT/2 } : { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 },
    opponentGoal: player.team === 'red' ? { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 } : { x: 0, y: PITCH_HEIGHT/2 }
  }), [players]);

  // Separar la lógica de goles para mejorar rendimiento
  const checkGoal = React.useCallback((position: Position): 'red' | 'blue' | null => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;

    if (position.x <= BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      return 'blue';
    }
    
    if (position.x >= PITCH_WIDTH - BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      return 'red';
    }

    return null;
  }, []);

  // Memoizar jugadores separados por rol para evitar filtrados repetitivos
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  // Función para sincronizar los modelos con el servidor
  const syncModels = React.useCallback(async () => {
    const now = Date.now();
    // Sincronizar solo si han pasado al menos 30 segundos desde la última vez
    if (now - lastSyncTimeRef.current < 30000) return;
    
    try {
      console.log("Sincronizando modelos con el servidor...");
      
      // Guardar los modelos actuales para cada jugador
      await Promise.all(playersRef.current
        .filter(p => p.role !== 'goalkeeper')
        .map(player => saveModel(player)
          .catch(err => console.error(`Error al guardar modelo para ${player.team} ${player.role} #${player.id}:`, err))
        )
      );
      
      // Obtener los últimos modelos del servidor
      const updatedPlayers = await syncAllPlayers(playersRef.current);
      
      // Actualizar los jugadores con los nuevos modelos
      setPlayers(updatedPlayers);
      
      lastSyncTimeRef.current = now;
      console.log("Sincronización completada");
    } catch (error) {
      console.error("Error durante la sincronización de modelos:", error);
    }
  }, [setPlayers]);

  React.useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    const TIME_STEP = 16; // 60 FPS target
    
    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= TIME_STEP) {
        updatePlayerPositions();

        // Incrementar contador de sincronización
        syncCounterRef.current += 1;
        
        // Sincronizar modelos cada ~600 frames (10 segundos a 60fps)
        if (syncCounterRef.current >= 600) {
          syncCounterRef.current = 0;
          syncModels();
        }
        
        setBall((prevBall) => {
          const STEPS = 16; // Reducido de 32 a 16 para mejorar rendimiento
          let newBallState = { ...prevBall };

          // Calcular el movimiento completo una vez
          const totalMovementX = newBallState.velocity.x / STEPS;
          const totalMovementY = newBallState.velocity.y / STEPS;

          for (let step = 1; step <= STEPS; step++) {
            const stepMovement = {
              x: newBallState.position.x + totalMovementX,
              y: newBallState.position.y + totalMovementY,
            };

            // Verificar colisiones primero con porteros
            let collision = false;
            for (const player of [...goalkeepers, ...fieldPlayers]) {
              if (checkCollision(stepMovement, player.position)) {
                const newVelocity = calculateNewVelocity(
                  stepMovement,
                  player.position,
                  newBallState.velocity,
                  player.role === 'goalkeeper'
                );

                const collisionAngle = Math.atan2(
                  stepMovement.y - player.position.y,
                  stepMovement.x - player.position.x
                );

                newBallState = {
                  position: {
                    x: player.position.x + (PLAYER_RADIUS + BALL_RADIUS) * Math.cos(collisionAngle),
                    y: player.position.y + (PLAYER_RADIUS + BALL_RADIUS) * Math.sin(collisionAngle)
                  },
                  velocity: newVelocity
                };

                // Registrar el último jugador en tocar el balón
                lastPlayerTouchRef.current = player;
                console.log(`Last touch: ${player.team} ${player.role} #${player.id}`);
                
                collision = true;
                break;
              }
            }

            if (!collision) {
              newBallState.position = stepMovement;
            }
          }

          // Verificar gol
          const scoringTeam = checkGoal(newBallState.position);
          if (scoringTeam) {
            setScore(prev => ({
              ...prev,
              [scoringTeam]: prev[scoringTeam] + 1
            }));

            setPlayers(currentPlayers => {
              // Actualizamos los cerebros de los jugadores
              const updatedPlayers = currentPlayers.map(player => {
                // Determinar si este jugador fue el último en tocar el balón
                const isLastTouch = lastPlayerTouchRef.current?.id === player.id;
                
                // Verificar si el último toque fue beneficioso o perjudicial
                const lastTouchRelevant = lastPlayerTouchRef.current !== null;
                const wasLastTouchHelpful = lastTouchRelevant && 
                  lastPlayerTouchRef.current.team === scoringTeam;
                const wasLastTouchHarmful = lastTouchRelevant && 
                  lastPlayerTouchRef.current.team !== scoringTeam;
                
                return {
                  ...player,
                  brain: updatePlayerBrain(
                    player.brain,
                    player.team === scoringTeam,
                    ball,
                    player,
                    getTeamContext(player),
                    (isLastTouch && (wasLastTouchHelpful || wasLastTouchHarmful))
                  )
                };
              });

              // Después de un gol, guardar inmediatamente los modelos del equipo que anotó
              updatedPlayers
                .filter(p => p.team === scoringTeam && p.role !== 'goalkeeper')
                .forEach(player => {
                  saveModel(player)
                    .catch(err => console.error(`Error al guardar modelo después del gol:`, err));
                });

              // También guardar el modelo del último jugador que tocó el balón si fue del equipo contrario
              if (lastPlayerTouchRef.current && lastPlayerTouchRef.current.team !== scoringTeam) {
                const lastTouchPlayer = updatedPlayers.find(p => p.id === lastPlayerTouchRef.current?.id);
                if (lastTouchPlayer) {
                  saveModel(lastTouchPlayer)
                    .catch(err => console.error(`Error al guardar modelo del último jugador:`, err));
                }
              }

              // Resetear la referencia al último jugador que tocó el balón
              lastPlayerTouchRef.current = null;
              
              return updatedPlayers;
            });

            return {
              position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
              velocity: { x: 2 * (scoringTeam === 'red' ? -1 : 1), y: 0 }
            };
          }

          // Rebotes en los límites del campo con cálculo optimizado
          const hitWallX = newBallState.position.x <= BALL_RADIUS || 
                          newBallState.position.x >= PITCH_WIDTH - BALL_RADIUS;
          const hitWallY = newBallState.position.y <= BALL_RADIUS || 
                          newBallState.position.y >= PITCH_HEIGHT - BALL_RADIUS;

          if (hitWallX) newBallState.velocity.x *= -0.9;
          if (hitWallY) newBallState.velocity.y *= -0.9;

          // Limitar posición del balón al campo
          return {
            position: {
              x: Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newBallState.position.x)),
              y: Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newBallState.position.y))
            },
            velocity: newBallState.velocity
          };
        });

        lastTime = currentTime;
      }
      
      frameId = requestAnimationFrame(gameLoop);
    };

    frameId = requestAnimationFrame(gameLoop);
    
    // Sincronizar modelos al iniciar
    syncModels();

    return () => {
      cancelAnimationFrame(frameId);
      
      // Al desmontar el componente, guardar los modelos actuales
      playersRef.current
        .filter(p => p.role !== 'goalkeeper')
        .forEach(player => {
          saveModel(player)
            .catch(err => console.error(`Error al guardar modelo al salir:`, err));
        });
    };
  }, [players, updatePlayerPositions, getTeamContext, checkGoal, goalkeepers, fieldPlayers, syncModels]);

  return null;
};

export default GameLogic;
