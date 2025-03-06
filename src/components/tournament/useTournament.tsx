
import { useState, useEffect, useCallback } from 'react';
import { Match, TournamentTeam } from '../../types/tournament';
import { teamKitColors } from '../../types/teamKits';
import { Score } from '../../types/football';
import { toast } from 'sonner';
import { clearKitSelectionCache } from '../../types/kits';

export const useTournament = (embeddedMode = false) => {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [playingMatch, setPlayingMatch] = useState(false);
  const [autoSimulation, setAutoSimulation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Lazy initialization approach
  useEffect(() => {
    if (!initialized && !isLoading) {
      // Only initialize teams - we'll create matches on demand
      initializeTeams();
      setInitialized(true);
    }
  }, [initialized, isLoading]);

  // Initialize teams first (fast)
  const initializeTeams = useCallback(() => {
    console.log("Initializing tournament teams");
    setIsLoading(true);
    
    // Create tournament teams from team kit colors
    const tournamentTeams: TournamentTeam[] = Object.entries(teamKitColors)
      .map(([name, colors], index) => ({
        id: index + 1,
        name,
        seed: index + 1,
        eloRating: 2000 - index * 4,
        kitColors: colors
      }))
      .slice(0, 128);

    setTeams(tournamentTeams);
    setIsLoading(false);
    
    toast.success("Tournament teams ready", {
      description: "128 teams ready for the competition"
    });
  }, []);

  // Lazy create matches for the current round
  const createMatchesForRound = useCallback((round: number) => {
    console.log(`Creating matches for round ${round}`);
    
    if (round === 1) {
      setIsLoading(true);
      
      // For first round, create all 64 matches and assign teams
      const initialMatches: Match[] = [];
      const totalRounds = 7;
      
      let matchId = 1;
      // Create match structure for all rounds
      for (let r = 1; r <= totalRounds; r++) {
        const matchesInRound = Math.pow(2, totalRounds - r);
        
        for (let position = 1; position <= matchesInRound; position++) {
          initialMatches.push({
            id: matchId++,
            round: r,
            position,
            played: false
          });
        }
      }
      
      // Randomly shuffle the home teams (strongest 64 teams)
      const homeTeams = [...teams.slice(0, 64)];
      for (let i = homeTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [homeTeams[i], homeTeams[j]] = [homeTeams[j], homeTeams[i]];
      }
      
      // Also randomly shuffle the away teams
      const awayTeams = [...teams.slice(64)];
      for (let i = awayTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [awayTeams[i], awayTeams[j]] = [awayTeams[j], awayTeams[i]];
      }
      
      // Assign teams to first-round matches
      for (let i = 0; i < 64; i++) {
        const match = initialMatches.find(m => m.round === 1 && m.position === i + 1);
        if (match) {
          match.teamA = homeTeams[i];
          match.teamB = awayTeams[i];
        }
      }
      
      setMatches(initialMatches);
      setCurrentRound(1);
      setIsLoading(false);
    } else {
      // For subsequent rounds, update upcoming matches based on previous round results
      setMatches(prevMatches => {
        const updatedMatches = [...prevMatches];
        
        // Get matches from previous round
        const previousRoundMatches = updatedMatches.filter(m => m.round === round - 1);
        
        // For each pair of previous round matches, set winners as teams for next round
        for (let i = 0; i < previousRoundMatches.length; i += 2) {
          if (i + 1 < previousRoundMatches.length) {
            const match1 = previousRoundMatches[i];
            const match2 = previousRoundMatches[i + 1];
            
            if (match1.played && match2.played && match1.winner && match2.winner) {
              const nextPosition = Math.ceil(match1.position / 2);
              const nextMatch = updatedMatches.find(
                m => m.round === round && m.position === nextPosition
              );
              
              if (nextMatch) {
                nextMatch.teamA = match1.winner;
                nextMatch.teamB = match2.winner;
              }
            }
          }
        }
        
        return updatedMatches;
      });
    }
  }, [teams]);

  // When current round changes, create matches for that round
  useEffect(() => {
    if (initialized && teams.length > 0 && !isLoading) {
      // Check if we need to create matches for the current round
      const roundMatches = matches.filter(m => m.round === currentRound);
      const needToCreateMatches = roundMatches.length === 0 || 
                                (currentRound > 1 && roundMatches.some(m => !m.teamA || !m.teamB));
      
      if (needToCreateMatches) {
        createMatchesForRound(currentRound);
      }
    }
  }, [currentRound, initialized, teams, matches, isLoading, createMatchesForRound]);

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
  }, [autoSimulation, playingMatch, currentRound, matches]);

  const initializeTournament = useCallback(() => {
    // Reset states
    setIsLoading(true);
    setMatches([]);
    setCurrentRound(1);
    setInitialized(false);
    setAutoSimulation(false);
    setActiveMatch(null);
    setPlayingMatch(false);
    clearKitSelectionCache();
    
    // Re-initialize
    initializeTeams();
    setInitialized(true);
    setIsLoading(false);

    toast.success("Tournament initialized", {
      description: "128 teams ready for the competition"
    });
  }, [initializeTeams]);

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
    
    const teamAStrength = currentMatch.teamA.eloRating + Math.random() * 100;
    const teamBStrength = currentMatch.teamB.eloRating + Math.random() * 100;
    
    const winner = teamAStrength > teamBStrength ? currentMatch.teamA : currentMatch.teamB;
    currentMatch.winner = winner;
    currentMatch.played = true;
    
    const strengthDiff = Math.abs(teamAStrength - teamBStrength);
    const goalDiff = Math.min(Math.floor(strengthDiff / 30), 5);
    const winnerGoals = 1 + Math.floor(Math.random() * 3) + Math.floor(goalDiff / 2);
    const loserGoals = Math.max(0, winnerGoals - goalDiff);
    
    currentMatch.score = {
      teamA: winnerGoals,
      teamB: loserGoals
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
  }, [matches]);

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
  }, [activeMatch, matches, currentRound, autoSimulation, playMatch]);

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
    isLoading,
    initializeTournament,
    resetTournament,
    playMatch,
    simulateSingleMatch,
    handleMatchComplete,
    startAutoSimulation,
    getWinner,
    setActiveMatch,
    setPlayingMatch
  };
};
