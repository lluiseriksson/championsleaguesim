
import { Player, Position, PITCH_WIDTH } from '../../types/football';

// Offside rule implementation
export const checkOffside = (
  player: Player,
  players: Player[],
  ball: Position,
  lastTouchTeam: 'red' | 'blue'
): boolean => {
  // No se aplica fuera de juego si el jugador es del equipo que no tocó la pelota por última vez
  if (player.team !== lastTouchTeam) {
    return false;
  }
  
  // No hay fuera de juego en el propio campo
  const isInOwnHalf = (player.team === 'red' && player.position.x < PITCH_WIDTH / 2) ||
                      (player.team === 'blue' && player.position.x > PITCH_WIDTH / 2);
  if (isInOwnHalf) {
    return false;
  }
  
  // Detectar la posición del penúltimo defensor del equipo contrario
  const opposingTeam = player.team === 'red' ? 'blue' : 'red';
  const opposingPlayers = players.filter(p => p.team === opposingTeam);
  
  // Incluir al portero y ordenar por posición X (para equipo rojo) o posición X inversa (para equipo azul)
  const sortedOpposingPlayers = [...opposingPlayers].sort((a, b) => {
    if (player.team === 'red') {
      return a.position.x - b.position.x; // Para el equipo rojo, ordenar de izquierda a derecha
    } else {
      return b.position.x - a.position.x; // Para el equipo azul, ordenar de derecha a izquierda
    }
  });
  
  // Si hay menos de 2 jugadores del equipo contrario, no hay fuera de juego
  if (sortedOpposingPlayers.length < 2) {
    return false;
  }
  
  // El penúltimo defensor es el segundo de la lista ordenada
  const penultimateDefender = sortedOpposingPlayers[1];
  
  // Comprobar si el jugador está más allá del penúltimo defensor
  if (player.team === 'red') {
    // Para el equipo rojo, fuera de juego si está más a la derecha que el penúltimo defensor
    return player.position.x > penultimateDefender.position.x;
  } else {
    // Para el equipo azul, fuera de juego si está más a la izquierda que el penúltimo defensor
    return player.position.x < penultimateDefender.position.x;
  }
};
