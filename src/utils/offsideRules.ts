
import { Player, Ball, Position } from '../types/football';

// Esta función ahora siempre devuelve false (sin regla de fuera de juego)
export const isOffside = (
  player: Player, 
  allPlayers: Player[],
  lastTeamTouched: 'red' | 'blue' | null
): boolean => {
  // No hay fuera de juego en este juego
  return false;
};

// Función para determinar qué equipo tocó por última vez el balón
export const getLastTeamTouchingBall = (players: Player[], ball: Ball): Player | null => {
  // Encuentra el jugador más cercano al balón dentro de la distancia de contacto
  const touchDistance = 25; // Proximidad requerida para considerar un toque
  
  // Filtrar jugadores cercanos al balón
  const nearbyPlayers = players.filter(player => {
    const dx = player.position.x - ball.position.x;
    const dy = player.position.y - ball.position.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared < touchDistance * touchDistance;
  });
  
  if (nearbyPlayers.length === 0) {
    return null;
  }
  
  // Devuelve el jugador más cercano
  return nearbyPlayers.reduce((closest, current) => {
    const closestDist = calculateDistance(closest.position, ball.position);
    const currentDist = calculateDistance(current.position, ball.position);
    return currentDist < closestDist ? current : closest;
  });
};

// Función auxiliar para calcular la distancia entre dos posiciones
const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
};
