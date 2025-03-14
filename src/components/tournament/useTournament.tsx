
import { useState, useEffect, useCallback, useRef } from 'react';
import { Match, TournamentTeam } from '../../types/tournament';
import { teamKitColors } from '../../types/teamKits';
import { Score } from '../../types/football';
import { toast } from 'sonner';
import { clearKitSelectionCache } from '../../types/kits';
import { determineWinnerByElo, generateScore, shouldUseGoldenGoal } from '../../utils/tournament/eloCalculator';
import { teamEloRatings } from '../../utils/tournament/eloRatings';

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
  
  // Add simulation timeout ref for cleanup
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add a lock to prevent starting new matches while one is still being processed
  const processingMatchRef = useRef(false);
  // Add a flag to track if we need to continue simulation after a match completes
  const continueSimulationRef = useRef(false);

  useEffect(() => {
    if (!initialized) {
      initializeTournament();
      setInitialized(true);
    }
    
    // Cleanup function to clear any pending timeouts
    return () => {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, [initialized]);

  useEffect(() => {
    // Clear any existing timeout to prevent race conditions
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    
    if (!autoSimulation || simulationPaused || playingMatch || currentRound > 7) {
      return;
    }
    
    const findNextUnplayedMatch = () => {
      return matches.find(m => 
        m.round === currentRound && 
        !m.played && 
        m.teamA && 
        m.teamB
      );
    };
    
    const simulateNextMatch = () => {
      // If we're already processing a match, don't start another one
      if (processingMatchRef.current || playingMatch) {
        console.log("Skipping simulation - another match is still being processed");
        return;
      }
      
      const nextMatch = findNextUnplayedMatch();
      
      if (nextMatch) {
        console.log(`Starting next match #${nextMatch.id} in round ${currentRound}`);
        // Set the lock before starting the match simulation
        processingMatchRef.current = true;
        continueSimulationRef.current = true;
        
        if (embeddedMode) {
          simulateSingleMatch(nextMatch);
          // Reset the lock after a short delay to allow state updates to complete
          setTimeout(() => {
            processingMatchRef.current = false;
            
            // Trigger next match after a short delay
            if (continueSimulationRef.current && autoSimulation && !simulationPaused) {
              simulationTimeoutRef.current = setTimeout(simulateNextMatch, 400);
            }
          }, 500);
        } else {
          playMatch(nextMatch);
          // For manual play, the lock will be reset in handleMatchComplete
        }
      } else {
        // Check if the current round is complete
        const roundMatches = matches.filter(m => m.round === currentRound);
        const allRoundMatchesPlayed = roundMatches.every(m => m.played);
        
        if (allRoundMatchesPlayed && currentRound < 7) {
          const nextRoundNumber = currentRound + 1;
          
          toast.success(`Round ${currentRound} completed!`, {
            description: `Advancing to ${
              nextRoundNumber === 2 ? "Round of 64" : 
              nextRoundNumber === 3 ? "Round of 32" : 
              nextRoundNumber === 4 ? "Round of 16" : 
              nextRoundNumber === 5 ? "Quarter-finals" : 
              nextRoundNumber === 6 ? "Semi-finals" : "Final"
            }`
          });
          
          setCurrentRound(nextRoundNumber);
          processingMatchRef.current = false; // Make sure to reset the lock
          
          // Allow a delay before processing the next round
          simulationTimeoutRef.current = setTimeout(() => {
            processingMatchRef.current = false; // Make sure to reset the lock
            if (autoSimulation && !simulationPaused) {
              simulateNextMatch();
            }
          }, 800); // Slightly longer delay between rounds
        } else if (currentRound === 7 && allRoundMatchesPlayed) {
          const winner = matches.find(m => m.round === 7)?.winner;
          toast.success(`Tournament Complete!`, {
            description: `Champion: ${winner?.name || "Unknown"}`,
          });
          
          setAutoSimulation(false);
          processingMatchRef.current = false; // Reset lock at end of tournament
          continueSimulationRef.current = false;
        }
      }
    };
    
    // Only schedule next match simulation if not currently processing a match
    if (!processingMatchRef.current) {
      const totalDelay = embeddedMode ? 200 : 400;
      simulationTimeoutRef.current = setTimeout(simulateNextMatch, totalDelay);
    }
    
    return () => {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, [autoSimulation, simulationPaused, playingMatch, currentRound, matches, matchesPlayed, embeddedMode]);

  const initializeTournament = useCallback(() => {
    const tournamentTeams: TournamentTeam[] = Object.entries(teamKitColors)
      .map(([name, colors]) => ({
        id: Math.floor(Math.random() * 100000),
        name,
        seed: Math.floor(Math.random() * 128) + 1,
        eloRating: teamEloRatings[name] || 1600,
        kitColors: colors
      }))
      .sort((a, b) => b.eloRating - a.eloRating)
      .slice(0, 128);

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
      description: "128 teams ready for the competition with real-world ELO ratings"
    });
  }, []);

  const resetTournament = useCallback(() => {
    setActiveMatch(null);
    setPlayingMatch(false);
    setInitialized(false);
    setAutoSimulation(false);
    processingMatchRef.current = false; // Reset processing lock on tournament reset
    continueSimulationRef.current = false;
    
    clearKitSelectionCache();
    setMatches([]);
    
    toast("Tournament reset", {
      description: "New random matchups have been created"
    });
  }, []);

  const playMatch = useCallback((match: Match) => {
    if (!match.teamA || !match.teamB || processingMatchRef.current) return;
    
    console.log(`Playing match #${match.id} in round ${match.round} manually`);
    processingMatchRef.current = true; // Set lock when playing a match manually
    setActiveMatch(match);
    setPlayingMatch(true);
  }, []);

  const simulateSingleMatch = useCallback((match: Match) => {
    if (!match.teamA || !match.teamB || processingMatchRef.current) {
      console.log(`Cannot simulate match #${match.id} - either invalid teams or another match is being processed`);
      return;
    }
    
    console.log(`Simulating match #${match.id} in round ${match.round}`);
    processingMatchRef.current = true; // Set lock when simulating a single match
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === match.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
      console.log(`Match #${match.id} not found or invalid teams`);
      processingMatchRef.current = false; // Reset lock if match is invalid
      return;
    }
    
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
    
    const { winner: winnerGoals, loser: loserGoals } = generateScore(
      winnerElo, 
      loserElo, 
      useGoldenGoal
    );
    
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
    
    currentMatch.played = true;
    currentMatch.winner = winner;
    
    if (currentMatch.round === 7) {
      toast.success("Tournament Complete!", {
        description: `Champion: ${winner.name}`
      });
      setAutoSimulation(false);
      continueSimulationRef.current = false;
    } else if (currentMatch.round < 7) {
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
    
    console.log(`Match #${match.id} simulation completed: ${currentMatch.teamA.name} ${currentMatch.score?.teamA}-${currentMatch.score?.teamB} ${currentMatch.teamB.name}`);
    
    setMatches(updatedMatches);
    setMatchesPlayed(prev => prev + 1);
    
    // Small delay before releasing the lock to prevent race conditions
    setTimeout(() => {
      processingMatchRef.current = false;
      
      // If auto simulation is still on, and this wasn't a final match,
      // continue to the next match
      if (autoSimulation && !simulationPaused && continueSimulationRef.current && currentMatch.round < 7) {
        console.log("Auto simulation will continue to next match after short delay");
      }
    }, 200);
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
    
    // MODIFICADO: En lugar de randomizar toda la ronda, sólo simula un partido a la vez
    if (currentRoundMatches.length > 0) {
      // Simular solo el primer partido sin jugar de la ronda actual
      simulateSingleMatch(currentRoundMatches[0]);
      
      toast.success("Match simulated", {
        description: `Match result determined using ELO probability formula`
      });
    }
  }, [currentRound, matches, simulateSingleMatch]);

  const handleMatchComplete = useCallback((winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => {
    if (!activeMatch) {
      console.log("No active match to complete");
      processingMatchRef.current = false; // Reset lock if no active match
      return;
    }
    
    console.log(`Completing match #${activeMatch.id} with winner: ${winnerName}`);
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === activeMatch.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
      console.log("Match not found or invalid teams");
      processingMatchRef.current = false; // Reset lock if match invalid
      return;
    }
    
    const winner = winnerName === currentMatch.teamA.name 
      ? currentMatch.teamA 
      : currentMatch.teamB;
    
    currentMatch.score = {
      teamA: finalScore.red,
      teamB: finalScore.blue
    };
    
    currentMatch.winner = winner;
    currentMatch.played = true;
    currentMatch.goldenGoal = wasGoldenGoal;
    
    if (currentMatch.round === 7) {
      toast.success("Tournament Complete!", {
        description: `Champion: ${winner.name}`
      });
      continueSimulationRef.current = false;
    } else if (currentMatch.round < 7) {
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
    
    console.log(`Match #${currentMatch.id} completion handled, continuing auto simulation: ${autoSimulation && continueSimulationRef.current}`);
    
    // Reset the lock after match is complete
    processingMatchRef.current = false;
    
    // If auto simulation is active and this wasn't the final match, continue simulation
    if (autoSimulation && !simulationPaused && continueSimulationRef.current && currentMatch.round < 7) {
      // Schedule the next match with a delay to allow state updates
      setTimeout(() => {
        const nextMatch = matches.find(m => 
          m.round === currentRound && 
          !m.played && 
          m.teamA && 
          m.teamB
        );
        
        if (nextMatch) {
          if (embeddedMode) {
            simulateSingleMatch(nextMatch);
          } else {
            playMatch(nextMatch);
          }
        }
      }, 500);
    }
  }, [activeMatch, matches, currentRound, autoSimulation, simulationPaused, embeddedMode, simulateSingleMatch, playMatch]);

  const startAutoSimulation = useCallback(() => {
    // Don't start auto simulation if we're already processing a match
    if (processingMatchRef.current) {
      console.log("Cannot start auto simulation - a match is already being processed");
      return;
    }
    
    console.log("Starting auto simulation");
    setAutoSimulation(true);
    setSimulationPaused(false);
    continueSimulationRef.current = true;
    
    // Immediately find and play the first match to kickstart the simulation
    processingMatchRef.current = false; // Ensure lock is not set
    
    const nextMatch = matches.find(m => 
      m.round === currentRound && 
      !m.played && 
      m.teamA && 
      m.teamB
    );
    
    if (nextMatch) {
      // Set a very short delay to ensure state updates have propagated
      setTimeout(() => {
        if (embeddedMode) {
          simulateSingleMatch(nextMatch);
        } else {
          playMatch(nextMatch);
        }
      }, 50);
    } else {
      // If no matches in current round, try to advance to the next round
      const roundMatches = matches.filter(m => m.round === currentRound);
      const allRoundMatchesPlayed = roundMatches.every(m => m.played);
      
      if (allRoundMatchesPlayed && currentRound < 7) {
        setCurrentRound(currentRound + 1);
      }
    }
    
    toast.success("Auto Simulation Started", {
      description: "Tournament will progress automatically"
    });
  }, [matches, currentRound, playMatch, simulateSingleMatch, embeddedMode]);

  const getWinner = useCallback(() => {
    const finalMatch = matches.find(m => m.round === 7);
    return finalMatch?.played ? finalMatch?.winner : undefined;
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
    setCurrentRound,
    setAutoSimulation,
    setSimulationPaused
  };
};
