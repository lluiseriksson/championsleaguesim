
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamKitColors } from '../types/teamKits';
import TournamentBracket from '../components/TournamentBracket';
import TournamentMatch from '../components/game/TournamentMatch';
import { Button } from '../components/ui/button';
import { Trophy, ArrowLeftCircle } from 'lucide-react';

// Tournament data structure
interface TournamentTeam {
  id: number;
  name: string;
  seed: number;
  eloRating: number;
  kitColors: {
    home: string;
    away: string;
    third: string;
  };
}

interface Match {
  id: number;
  round: number;
  position: number;
  teamA?: TournamentTeam;
  teamB?: TournamentTeam;
  winner?: TournamentTeam;
  played: boolean;
}

const Tournament: React.FC = () => {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [playingMatch, setPlayingMatch] = useState(false);

  // Initialize tournament with teams
  useEffect(() => {
    if (!initialized) {
      initializeTournament();
      setInitialized(true);
    }
  }, [initialized]);

  const initializeTournament = () => {
    // Create team objects from teamKitColors
    const tournamentTeams: TournamentTeam[] = Object.entries(teamKitColors).map(([name, colors], index) => ({
      id: index + 1,
      name,
      seed: index + 1,
      eloRating: 2000 - index * 4, // Simple mock ELO calculation
      kitColors: colors
    })).slice(0, 128); // Ensure we only use 128 teams

    setTeams(tournamentTeams);

    // Create initial round matches (64 matches for 128 teams)
    const initialMatches: Match[] = [];
    const totalRounds = 7; // 128 teams requires 7 rounds: 64, 32, 16, 8, 4, 2, 1
    
    // Create empty bracket structure for all rounds
    let matchId = 1;
    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      
      for (let position = 1; position <= matchesInRound; position++) {
        initialMatches.push({
          id: matchId++,
          round,
          position,
          played: false
        });
      }
    }
    
    // Fill in first round with teams (seeding logic: 1 vs 128, 2 vs 127, etc.)
    for (let i = 0; i < 64; i++) {
      const match = initialMatches.find(m => m.round === 1 && m.position === i + 1);
      if (match) {
        match.teamA = tournamentTeams[i];
        match.teamB = tournamentTeams[127 - i];
      }
    }
    
    setMatches(initialMatches);
  };

  // Funciones para jugar partidos
  const playMatch = (match: Match) => {
    if (!match.teamA || !match.teamB) return;
    
    setActiveMatch(match);
    setPlayingMatch(true);
  };

  const handleMatchComplete = (winnerName: string) => {
    if (!activeMatch) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === activeMatch.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
    // Determinar el equipo ganador
    const winner = winnerName === currentMatch.teamA.name 
      ? currentMatch.teamA 
      : currentMatch.teamB;
    
    // Actualizar el partido actual
    currentMatch.winner = winner;
    currentMatch.played = true;
    
    // Avanzar el ganador a la siguiente ronda
    if (currentMatch.round < 7) {
      const nextRoundPosition = Math.ceil(currentMatch.position / 2);
      const nextMatch = updatedMatches.find(
        m => m.round === currentMatch.round + 1 && m.position === nextRoundPosition
      );
      
      if (nextMatch) {
        if (!nextMatch.teamA) {
          nextMatch.teamA = winner;
        } else {
          nextMatch.teamB = winner;
        }
      }
    }
    
    setMatches(updatedMatches);
    setActiveMatch(null);
    setPlayingMatch(false);
    
    // Comprobar si se ha completado toda la ronda
    const roundMatches = updatedMatches.filter(m => m.round === currentRound);
    const allRoundMatchesPlayed = roundMatches.every(m => m.played);
    
    if (allRoundMatchesPlayed) {
      setCurrentRound(prevRound => prevRound + 1);
    }
  };

  // Auto-jugar todos los partidos de una ronda usando simulación
  const playRoundWithSimulation = () => {
    if (currentRound > 7) return; // Tournament is complete
    
    const updatedMatches = [...matches];
    
    // Find all matches in current round
    const currentMatches = updatedMatches.filter(m => m.round === currentRound && !m.played);
    
    // Play each match and set winners
    currentMatches.forEach(match => {
      if (!match.teamA || !match.teamB) return;
      
      // Determine winner based on ELO rating with some randomness
      const teamAStrength = match.teamA.eloRating + Math.random() * 100;
      const teamBStrength = match.teamB.eloRating + Math.random() * 100;
      
      match.winner = teamAStrength > teamBStrength ? match.teamA : match.teamB;
      match.played = true;
      
      // Advance winner to next round
      if (match.winner && currentRound < 7) {
        const nextRoundPosition = Math.ceil(match.position / 2);
        const nextMatch = updatedMatches.find(m => m.round === currentRound + 1 && m.position === nextRoundPosition);
        
        if (nextMatch) {
          if (!nextMatch.teamA) {
            nextMatch.teamA = match.winner;
          } else {
            nextMatch.teamB = match.winner;
          }
        }
      }
    });
    
    setMatches(updatedMatches);
    setCurrentRound(prevRound => prevRound + 1);
  };

  const getTournamentStatus = () => {
    if (currentRound <= 7) {
      const roundNames = ["", "Round of 128", "Round of 64", "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
      return roundNames[currentRound] || "Tournament in Progress";
    } else {
      const winner = matches.find(m => m.round === 7)?.winner;
      return winner ? `Tournament Complete - Winner: ${winner.name}` : "Tournament Complete";
    }
  };

  const getWinner = () => {
    return matches.find(m => m.round === 7)?.winner;
  };

  // Si hay un partido activo en juego, mostrar el componente de partidos
  if (playingMatch && activeMatch && activeMatch.teamA && activeMatch.teamB) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              setActiveMatch(null);
              setPlayingMatch(false);
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeftCircle className="h-4 w-4" />
            Volver al Torneo
          </Button>
          <h2 className="text-xl font-semibold">
            {activeMatch.teamA.name} vs {activeMatch.teamB.name}
          </h2>
        </div>
        
        <TournamentMatch 
          homeTeam={activeMatch.teamA.name}
          awayTeam={activeMatch.teamB.name}
          onMatchComplete={handleMatchComplete}
          matchDuration={180} // 3 minutos
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Football Tournament</h1>
      
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{getTournamentStatus()}</h2>
        {currentRound <= 7 ? (
          <div className="flex gap-4">
            <Button 
              onClick={playRoundWithSimulation} 
              className="bg-gray-600 hover:bg-gray-700"
            >
              Simular {currentRound === 7 ? "Final" : "Ronda " + currentRound}
            </Button>
            <Button 
              onClick={() => {
                // Buscar el primer partido no jugado de la ronda actual
                const matchToPlay = matches.find(
                  m => m.round === currentRound && !m.played && m.teamA && m.teamB
                );
                if (matchToPlay) {
                  playMatch(matchToPlay);
                }
              }} 
              className="bg-green-600 hover:bg-green-700"
            >
              Jugar Partido
            </Button>
          </div>
        ) : (
          <div className="flex items-center text-amber-500 font-bold gap-2">
            <Trophy className="h-6 w-6" />
            <span>Champion: {getWinner()?.name}</span>
          </div>
        )}
      </div>
      
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline">← Back to Match Simulation</Link>
      </div>
      
      <div className="overflow-x-auto">
        <TournamentBracket 
          matches={matches} 
          onMatchClick={(match) => {
            if (match.teamA && match.teamB && !match.played) {
              playMatch(match);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Tournament;
