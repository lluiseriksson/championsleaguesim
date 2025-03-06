
import { useState, useEffect, useCallback } from 'react';
import { Match, TournamentTeam } from '../../types/tournament';
import { teamKitColors } from '../../types/kits';
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

  useEffect(() => {
    if (!initialized) {
      initializeTournament();
      setInitialized(true);
    }
  }, [initialized]);

  // First, we need to define these functions before using them in the dependency array
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

  // Now we can use them in the useEffect dependency array
  useEffect(() => {
    if (!autoSimulation) {
      console.log("Auto simulation not enabled, returning");
      return;
    }
    
    if (currentRound > 7) {
      console.log("Tournament complete (round > 7), returning");
      return;
    }
    
    // In embedded mode, don't worry about playingMatch
    if (playingMatch && !embeddedMode) {
      console.log("Playing match active and not in embedded mode, skipping simulation");
      return;
    }
    
    console.log("Auto simulation running, currentRound:", currentRound);
    
    let timeoutId: NodeJS.Timeout;
    
    const findNextUnplayedMatch = () => {
      const nextMatch = matches.find(m => 
        m.round === currentRound && 
        !m.played && 
        m.teamA && 
        m.teamB
      );
      
      if (nextMatch) {
        console.log("Found next match to play:", nextMatch.teamA?.name, "vs", nextMatch.teamB?.name);
      } else {
        console.log("No more unplayed matches found in round", currentRound);
      }
      
      return nextMatch;
    };
    
    const simulateNextMatch = () => {
      const nextMatch = findNextUnplayedMatch();
      
      if (nextMatch) {
        console.log("Simulating match:", nextMatch.teamA?.name, "vs", nextMatch.teamB?.name);
        if (embeddedMode) {
          simulateSingleMatch(nextMatch);
          
          // When in embedded mode, schedule the next match simulation immediately
          timeoutId = setTimeout(simulateNextMatch, 800);
        } else {
          playMatch(nextMatch);
        }
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
          
          console.log("All matches in round", currentRound, "completed, advancing to next round");
          setCurrentRound(prevRound => prevRound + 1);
          
          // Schedule the next round after a short delay
          timeoutId = setTimeout(simulateNextMatch, 1500);
        } else if (currentRound === 7 && allRoundMatchesPlayed) {
          const winner = matches.find(m => m.round === 7)?.winner;
          toast.success(`Tournament Complete!`, {
            description: `Champion: ${winner?.name || "Unknown"}`,
          });
          
          console.log("Tournament complete! Winner:", winner?.name);
          setAutoSimulation(false);
        }
      }
    };
    
    // Start the simulation process
    console.log("Starting simulation process...");
    timeoutId = setTimeout(simulateNextMatch, 800);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoSimulation, playingMatch, currentRound, matches, embeddedMode, simulateSingleMatch, playMatch]);

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

    // Randomly shuffle the home teams (strongest 64 teams)
    const homeTeams = [...tournamentTeams.slice(0, 64)];
    for (let i = homeTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [homeTeams[i], homeTeams[j]] = [homeTeams[j], homeTeams[i]];
    }

    // Also randomly shuffle the away teams
    const awayTeams = [...tournamentTeams.slice(64)];
    for (let i = awayTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [awayTeams[i], awayTeams[j]] = [awayTeams[j], awayTeams[i]];
    }

    // Assign teams to first-round matches using the shuffled arrays
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

  const handleMatchComplete = useCallback((winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => {
    if (!activeMatch) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === activeMatch.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
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
        console.log("Auto simulation continuing after match completion");
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
    console.log("Starting auto simulation with embeddedMode:", embeddedMode);
    setAutoSimulation(true);
    toast.success("Auto Simulation Started", {
      description: "Tournament will progress automatically"
    });
  }, [embeddedMode]);

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
