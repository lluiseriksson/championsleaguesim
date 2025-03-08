import { useState, useEffect, useCallback } from 'react';
import { Match, TournamentTeam } from '../../types/tournament';
import { teamKitColors } from '../../types/teamKits';
import { Score } from '../../types/football';
import { toast } from 'sonner';
import { clearKitSelectionCache } from '../../types/kits';
import { determineWinnerByElo, generateScore, shouldUseGoldenGoal } from '../../utils/tournament/eloCalculator';

export const useTournament = (embeddedMode = false) => {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [playingMatch, setPlayingMatch] = useState(false);
  const [autoSimulation, setAutoSimulation] = useState(false);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [matchesPlayed, setMatchesPlayed] = useState(0);

  useEffect(() => {
    if (!initialized) {
      initializeTournament();
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => {
    if (!autoSimulation || playingMatch || currentRound > 7 || simulationPaused) return;
    
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
          
          setSimulationPaused(true);
          timeoutId = setTimeout(() => {
            setSimulationPaused(false);
            simulateNextMatch();
          }, 3000);
        } else if (currentRound === 7 && allRoundMatchesPlayed) {
          const winner = matches.find(m => m.round === 7)?.winner;
          toast.success(`Tournament Complete!`, {
            description: `Champion: ${winner?.name || "Unknown"}`,
          });
          
          setAutoSimulation(false);
        }
      }
    };
    
    const baseDelay = 800;
    const additionalDelay = Math.min(1500, matchesPlayed * 30);
    
    timeoutId = setTimeout(simulateNextMatch, baseDelay + additionalDelay);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoSimulation, playingMatch, currentRound, matches, simulationPaused, matchesPlayed]);

  const initializeTournament = useCallback(() => {
    const tournamentTeams: TournamentTeam[] = Object.entries(teamKitColors).map(([name, colors], index) => ({
      id: index + 1,
      name,
      seed: index + 1,
      eloRating: 2000 - index * 4,
      kitColors: colors
    })).slice(0, 128);

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

    const homeTeams = [...tournamentTeams.slice(0, 64)];
    for (let i = homeTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [homeTeams[i], homeTeams[j]] = [homeTeams[j], homeTeams[i]];
    }

    const awayTeams = [...tournamentTeams.slice(64)];
    for (let i = awayTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [awayTeams[i], awayTeams[j]] = [awayTeams[j], awayTeams[i]];
    }

    for (let i = 0; i < 64; i++) {
      const match = initialMatches.find(m => m.round === 1 && m.position === i + 1);
      if (match) {
        match.teamA = homeTeams[i];
        match.teamB = awayTeams[i];
      }
    }

    setMatches(initialMatches);
    setCurrentRound(1);
    
    toast.success("Tournament initialized", {
      description: "128 teams ready for the competition"
    });
  }, []);

  const resetTournament = useCallback(() => {
    setActiveMatch(null);
    setPlayingMatch(false);
    setInitialized(false);
    setAutoSimulation(false);
    
    clearKitSelectionCache();
    setMatches([]);
    
    toast("Tournament reset", {
      description: "New random matchups have been created"
    });
  }, []);

  const playMatch = useCallback((match: Match) => {
    if (!match.teamA || !match.teamB) return;
    
    setActiveMatch(match);
    setPlayingMatch(true);
  }, []);

  const simulateSingleMatch = useCallback((match: Match) => {
    if (!match.teamA || !match.teamB) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === match.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
    const winnerTeam = determineWinnerByElo(
      currentMatch.teamA.eloRating, 
      currentMatch.teamB.eloRating
    );
    
    const winner = winnerTeam === 'A' ? currentMatch.teamA : currentMatch.teamB;
    currentMatch.winner = winner;
    currentMatch.played = true;
    
    const useGoldenGoal = shouldUseGoldenGoal(
      currentMatch.teamA.eloRating,
      currentMatch.teamB.eloRating
    );
    
    currentMatch.goldenGoal = useGoldenGoal;
    
    const winnerElo = winner.eloRating;
    const loserElo = winner.id === currentMatch.teamA.id 
      ? currentMatch.teamB.eloRating 
      : currentMatch.teamA.eloRating;
    
    const { winner: winnerGoals, loser: loserGoals } = generateScore(winnerElo, loserElo);
    
    if (winner.id === currentMatch.teamA.id) {
      currentMatch.score = {
        teamA: winnerGoals,
        teamB: loserGoals
      };
    } else {
      currentMatch.score = {
        teamA: loserGoals,
        teamB: winnerGoals
      };
    }
    
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
    setMatchesPlayed(prev => prev + 1);
  }, [matches]);

  const randomizeCurrentRound = useCallback(() => {
    const currentRoundMatches = matches.filter(
      m => m.round === currentRound && m.teamA && m.teamB && !m.played
    );
    
    if (currentRoundMatches.length === 0) {
      const nextRound = currentRound + 1;
      
      if (nextRound <= 7) {
        const nextRoundMatches = matches.filter(
          m => m.round === nextRound && m.teamA && m.teamB && !m.played
        );
        
        if (nextRoundMatches.length > 0) {
          setCurrentRound(nextRound);
          toast.success(`Advanced to ${
            nextRound === 2 ? "Round of 64" : 
            nextRound === 3 ? "Round of 32" : 
            nextRound === 4 ? "Round of 16" : 
            nextRound === 5 ? "Quarter-finals" : 
            nextRound === 6 ? "Semi-finals" : "Final"
          }`, {
            description: "Ready to randomize the next round"
          });
          return;
        }
      }
      
      toast.error("No matches to randomize", {
        description: "All matches in this round are already played or not set up yet."
      });
      return;
    }
    
    const updatedMatches = [...matches];
    let simulatedCount = 0;
    
    for (const match of currentRoundMatches) {
      const matchToUpdate = updatedMatches.find(m => m.id === match.id);
      
      if (matchToUpdate && matchToUpdate.teamA && matchToUpdate.teamB && !matchToUpdate.played) {
        const winnerTeam = determineWinnerByElo(
          matchToUpdate.teamA.eloRating, 
          matchToUpdate.teamB.eloRating
        );
        
        const winner = winnerTeam === 'A' ? matchToUpdate.teamA : matchToUpdate.teamB;
        matchToUpdate.winner = winner;
        matchToUpdate.played = true;
        
        const useGoldenGoal = shouldUseGoldenGoal(
          matchToUpdate.teamA.eloRating,
          matchToUpdate.teamB.eloRating
        );
        
        matchToUpdate.goldenGoal = useGoldenGoal;
        
        const winnerElo = winner.eloRating;
        const loserElo = winner.id === matchToUpdate.teamA.id 
          ? matchToUpdate.teamB.eloRating 
          : matchToUpdate.teamA.eloRating;
        
        const { winner: winnerGoals, loser: loserGoals } = generateScore(winnerElo, loserElo);
        
        if (winner.id === matchToUpdate.teamA.id) {
          matchToUpdate.score = {
            teamA: winnerGoals,
            teamB: loserGoals
          };
        } else {
          matchToUpdate.score = {
            teamA: loserGoals,
            teamB: winnerGoals
          };
        }
        
        if (matchToUpdate.round < 7) {
          const nextRoundPosition = Math.ceil(matchToUpdate.position / 2);
          const nextMatch = updatedMatches.find(
            m => m.round === matchToUpdate.round + 1 && m.position === nextRoundPosition
          );
          
          if (nextMatch) {
            if (!nextMatch.teamA) {
              nextMatch.teamA = winner;
            } else {
              nextMatch.teamB = winner;
            }
          }
        }
        
        simulatedCount++;
      }
    }
    
    setMatches(updatedMatches);
    setMatchesPlayed(prev => prev + simulatedCount);
    
    const roundName = currentRound === 1 ? "Round of 128" : 
                      currentRound === 2 ? "Round of 64" : 
                      currentRound === 3 ? "Round of 32" :
                      currentRound === 4 ? "Round of 16" :
                      currentRound === 5 ? "Quarter-finals" :
                      currentRound === 6 ? "Semi-finals" : "Final";
    
    toast.success(`${roundName} randomized`, {
      description: `${simulatedCount} matches simulated using ELO probability formula`
    });
    
    const allRoundMatchesPlayed = updatedMatches
      .filter(m => m.round === currentRound)
      .every(m => m.played);
    
    if (allRoundMatchesPlayed && currentRound < 7) {
      setCurrentRound(nextRound);
      toast.success(`Advanced to ${
        nextRound === 2 ? "Round of 64" : 
        nextRound === 3 ? "Round of 32" : 
        nextRound === 4 ? "Round of 16" : 
        nextRound === 5 ? "Quarter-finals" : 
        nextRound === 6 ? "Semi-finals" : "Final"
      }`, {
        description: "Ready to randomize the next round"
      });
    } else if (currentRound === 7 && allRoundMatchesPlayed) {
      const winner = updatedMatches.find(m => m.round === 7)?.winner;
      toast.success("Tournament Complete!", {
        description: `Champion: ${winner?.name || "Unknown"}`
      });
    }
  }, [currentRound, matches]);

  const handleMatchComplete = useCallback((winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => {
    if (!activeMatch) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === activeMatch.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
    const winner = winnerName === currentMatch.teamA.name 
      ? currentMatch.teamA 
      : currentMatch.teamB;
    
    const homeTeam = currentMatch.teamA;
    const awayTeam = currentMatch.teamB;
    
    currentMatch.score = {
      teamA: finalScore.red,
      teamB: finalScore.blue
    };
    
    currentMatch.winner = winner;
    currentMatch.played = true;
    currentMatch.goldenGoal = wasGoldenGoal;
    
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
    setMatchesPlayed(prev => prev + 1);
    
    if (autoSimulation) {
      setSimulationPaused(true);
      
      const pauseTime = Math.min(2000, 1000 + matchesPlayed * 20);
      
      setTimeout(() => {
        setSimulationPaused(false);
        const nextMatch = updatedMatches.find(
          m => m.round === currentRound && !m.played && m.teamA && m.teamB
        );
        if (nextMatch) {
          playMatch(nextMatch);
        }
      }, pauseTime);
    }
  }, [activeMatch, matches, currentRound, autoSimulation, matchesPlayed]);

  const startAutoSimulation = useCallback(() => {
    setAutoSimulation(true);
    toast.success("Auto Simulation Started", {
      description: "Tournament will progress automatically"
    });
  }, []);

  const getWinner = useCallback(() => {
    return matches.find(m => m.round === 7)?.winner;
  }, [matches]);

  return {
    teams,
    matches,
    currentRound,
    activeMatch,
    playingMatch,
    autoSimulation,
    simulationPaused,
    matchesPlayed,
    initializeTournament,
    resetTournament,
    playMatch,
    simulateSingleMatch,
    handleMatchComplete,
    startAutoSimulation,
    randomizeCurrentRound,
    getWinner,
    setActiveMatch,
    setPlayingMatch,
    setCurrentRound
  };
};
