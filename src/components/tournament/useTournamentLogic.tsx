
import { useState, useEffect } from 'react';
import { TournamentTeam, Match } from '../../types/tournament';
import { Score } from '../../types/football';
import { toast } from 'sonner';
import { teamKitColors } from '../../types/teamKits';
import { teamEloRatings, calculateStrengthMultiplier } from '../../data/teamEloData';

export const useTournamentLogic = (embeddedMode = false) => {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [playingMatch, setPlayingMatch] = useState(false);
  const [autoSimulation, setAutoSimulation] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState('normal');

  useEffect(() => {
    if (!initialized) {
      initializeTournament();
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => {
    if (!autoSimulation || playingMatch || currentRound > 7) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const findNextUnplayedMatch = () => {
      return matches.find(m => 
        m.round === currentRound && 
        !m.played && 
        m.teamA && 
        m.teamB
      );
    };
    
    const simulateNextMatch = () => {
      const nextMatch = findNextUnplayedMatch();
      
      if (nextMatch) {
        playMatch(nextMatch);
      } else {
        const roundMatches = matches.filter(m => m.round === currentRound);
        const allRoundMatchesPlayed = roundMatches.every(m => m.played);
        
        if (allRoundMatchesPlayed && currentRound < 7) {
          toast.success(`Round ${currentRound} completed!`, {
            description: `Advancing to ${
              currentRound === 1 ? "Round of 64" : 
              currentRound === 2 ? "Round of 32" : 
              currentRound === 3 ? "Round of 16" : 
              currentRound === 4 ? "Quarter-finals" : 
              currentRound === 5 ? "Semi-finals" : "Final"
            }`
          });
          
          setCurrentRound(prevRound => prevRound + 1);
          timeoutId = setTimeout(simulateNextMatch, 1500);
        } else if (currentRound === 7 && allRoundMatchesPlayed) {
          const winner = matches.find(m => m.round === 7)?.winner;
          toast.success(`Tournament Complete!`, {
            description: `Champion: ${winner?.name || "Unknown"}`,
          });
          
          setAutoSimulation(false);
        }
      }
    };
    
    timeoutId = setTimeout(simulateNextMatch, 800);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoSimulation, playingMatch, currentRound, matches, simulationSpeed]);

  const initializeTournament = () => {
    // Usamos los equipos reales con sus ELO
    const tournamentTeams: TournamentTeam[] = teamEloRatings.map((team, index) => {
      // Buscamos los colores de kit. Si no existe, usamos un equipo genérico
      const kitColors = teamKitColors[team.name] || Object.values(teamKitColors)[0];
      
      return {
        id: index + 1,
        name: team.name,
        seed: index + 1,
        eloRating: team.elo,
        kitColors
      };
    }).slice(0, 128);

    setTeams(tournamentTeams);

    const initialMatches: Match[] = [];
    const totalRounds = 7;

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

    // Agrupamos los equipos por seeding (usando el ELO como base)
    const sortedTeams = [...tournamentTeams].sort((a, b) => b.eloRating - a.eloRating);
    const topTeams = sortedTeams.slice(0, 64);
    const bottomTeams = sortedTeams.slice(64);
    
    // Distribuimos los enfrentamientos para que los mejores equipos
    // se enfrenten a los peores en la primera ronda
    for (let i = 0; i < 64; i++) {
      const match = initialMatches.find(m => m.round === 1 && m.position === i + 1);
      if (match) {
        match.teamA = topTeams[i];
        match.teamB = bottomTeams[i];
      }
    }

    setMatches(initialMatches);
    setCurrentRound(1);
    
    toast.success("Tournament initialized", {
      description: "128 teams ready for the competition with real ELO ratings"
    });
  };

  const resetTournament = () => {
    setActiveMatch(null);
    setPlayingMatch(false);
    setInitialized(false);
    setAutoSimulation(false);
    
    toast("Tournament reset", {
      description: "New matchups based on real ELO ratings have been created"
    });
  };

  const playMatch = (match: Match) => {
    if (!match.teamA || !match.teamB) return;
    
    setActiveMatch(match);
    setPlayingMatch(true);
  };

  const simulateSingleMatch = (match: Match) => {
    if (!match.teamA || !match.teamB) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === match.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
    // Calculamos los multiplicadores de fuerza basados en ELO
    const teamAMultiplier = calculateStrengthMultiplier(currentMatch.teamA.eloRating);
    const teamBMultiplier = calculateStrengthMultiplier(currentMatch.teamB.eloRating);
    
    // Aplicamos los multiplicadores a la fuerza base y añadimos algo de aleatoriedad
    const teamAStrength = currentMatch.teamA.eloRating * teamAMultiplier + Math.random() * 100;
    const teamBStrength = currentMatch.teamB.eloRating * teamBMultiplier + Math.random() * 100;
    
    const winner = teamAStrength > teamBStrength ? currentMatch.teamA : currentMatch.teamB;
    currentMatch.winner = winner;
    currentMatch.played = true;
    
    // La diferencia de goles se basa en la diferencia de fuerzas
    const strengthDiff = Math.abs(teamAStrength - teamBStrength);
    const goalDiff = Math.min(Math.floor(strengthDiff / 200), 5); // Ajustado para que sea menos extremo
    const winnerGoals = 1 + Math.floor(Math.random() * 3) + Math.floor(goalDiff / 2);
    const loserGoals = Math.max(0, winnerGoals - goalDiff);
    
    currentMatch.score = {
      teamA: teamAStrength > teamBStrength ? winnerGoals : loserGoals,
      teamB: teamBStrength > teamAStrength ? winnerGoals : loserGoals
    };
    
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
  };

  const handleMatchComplete = (winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => {
    if (!activeMatch) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === activeMatch.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
    const winner = winnerName === currentMatch.teamA.name 
      ? currentMatch.teamA 
      : currentMatch.teamB;
    
    const homeIsWinner = currentMatch.teamA.name === winnerName;
    
    let homeScore = homeIsWinner ? finalScore.red : finalScore.blue;
    let awayScore = homeIsWinner ? finalScore.blue : finalScore.red;
    
    if (wasGoldenGoal && homeScore === awayScore) {
      if (homeIsWinner) {
        homeScore += 1;
      } else {
        awayScore += 1;
      }
    }
    
    currentMatch.winner = winner;
    currentMatch.played = true;
    currentMatch.goldenGoal = wasGoldenGoal;
    currentMatch.score = {
      teamA: homeScore,
      teamB: awayScore
    };
    
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
    
    const roundMatches = updatedMatches.filter(m => m.round === currentRound);
    const allRoundMatchesPlayed = roundMatches.every(m => m.played);
    
    if (allRoundMatchesPlayed) {
      setCurrentRound(prevRound => prevRound + 1);
    }
    
    if (autoSimulation) {
      setTimeout(() => {
        const nextMatch = updatedMatches.find(
          m => m.round === currentRound && !m.played && m.teamA && m.teamB
        );
        if (nextMatch) {
          playMatch(nextMatch);
        }
      }, 1000);
    }
  };

  const playRoundWithSimulation = () => {
    if (currentRound > 7) return;
    
    const currentMatch = matches.find(
      m => m.round === currentRound && !m.played && m.teamA && m.teamB
    );
    
    if (currentMatch) {
      playMatch(currentMatch);
    } else {
      setCurrentRound(prevRound => prevRound + 1);
    }
  };

  const startAutoSimulation = () => {
    setAutoSimulation(true);
    toast.success("Auto Simulation Started", {
      description: "Tournament will progress automatically with ELO-based strength"
    });
  };

  const getWinner = () => {
    return matches.find(m => m.round === 7)?.winner;
  };

  const handleBackToTournament = () => {
    setActiveMatch(null);
    setPlayingMatch(false);
  };

  const handleMatchClick = (match: Match) => {
    if (!autoSimulation && match.teamA && match.teamB && !match.played) {
      if (embeddedMode) {
        simulateSingleMatch(match);
      } else {
        playMatch(match);
      }
    }
  };

  return {
    matches,
    currentRound,
    activeMatch,
    playingMatch,
    autoSimulation,
    resetTournament,
    startAutoSimulation,
    handleMatchComplete,
    handleMatchClick,
    handleBackToTournament,
    getWinner
  };
};
