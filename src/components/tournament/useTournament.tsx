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

  const playMatch = useCallback((match: Match) => {
    if (!match.teamA || !match.teamB) {
      console.log("Cannot play match: missing teams", match);
      return;
    }
    
    console.log("Playing match:", match.teamA.name, "vs", match.teamB.name);
    setActiveMatch(match);
    setPlayingMatch(true);
  }, []);

  const simulateSingleMatch = useCallback((match: Match) => {
    if (!match.teamA || !match.teamB) {
      console.log("Cannot simulate match: missing teams", match);
      return;
    }
    
    console.log("Simulating match:", match.teamA.name, "vs", match.teamB.name);
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === match.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
      console.log("Match not found in matches array", match.id);
      return;
    }
    
    if (autoSimulation) {
      setActiveMatch(match);
      setPlayingMatch(true);
    }
    
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
      teamA: winner.id === currentMatch.teamA.id ? winnerGoals : loserGoals,
      teamB: winner.id === currentMatch.teamB.id ? winnerGoals : loserGoals
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
  }, [matches, autoSimulation]);

  useEffect(() => {
    if (!autoSimulation) {
      console.log("Auto simulation not enabled, returning");
      return;
    }
    
    console.log("Auto simulation running, currentRound:", currentRound);
    
    if (currentRound > 7) {
      console.log("Tournament complete (round > 7), stopping auto simulation");
      setAutoSimulation(false);
      setActiveMatch(null);
      setPlayingMatch(false);
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    
    const findNextUnplayedMatch = () => {
      console.log("Finding next unplayed match...");
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
      console.log("Attempting to simulate next match...");
      const nextMatch = findNextUnplayedMatch();
      
      if (nextMatch) {
        console.log("Simulating match:", nextMatch.teamA?.name, "vs", nextMatch.teamB?.name);
        
        setActiveMatch(nextMatch);
        setPlayingMatch(true);
        
        if (embeddedMode) {
          simulateSingleMatch(nextMatch);
          
          timeoutId = setTimeout(simulateNextMatch, 1500);
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
          
          setCurrentRound(prevRound => prevRound + 1);
          
          timeoutId = setTimeout(simulateNextMatch, 2500);
        } else if (currentRound === 7 && allRoundMatchesPlayed) {
          const winner = matches.find(m => m.round === 7)?.winner;
          toast.success(`Tournament Complete!`, {
            description: `Champion: ${winner?.name || "Unknown"}`,
          });
          
          console.log("Tournament complete! Winner:", winner?.name);
          setAutoSimulation(false);
          setActiveMatch(null);
          setPlayingMatch(false);
        }
      }
    };
    
    console.log("Starting simulation process...");
    timeoutId = setTimeout(simulateNextMatch, 800);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoSimulation, matches, currentRound, embeddedMode, simulateSingleMatch, playMatch]);

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

  const handleMatchComplete = useCallback((winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => {
    if (!activeMatch) return;
    
    console.log("Match completed:", winnerName, "won with score", finalScore);
    
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
    
    if (!autoSimulation) {
      setActiveMatch(null);
      setPlayingMatch(false);
    }
    
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
    
    const firstMatch = matches.find(m => 
      m.round === currentRound && 
      !m.played && 
      m.teamA && 
      m.teamB
    );
    
    if (firstMatch) {
      console.log("Found first match to start auto simulation:", firstMatch.teamA?.name, "vs", firstMatch.teamB?.name);
      
      setActiveMatch(firstMatch);
      setPlayingMatch(true);
      setAutoSimulation(true);
      
      toast.success("Auto Simulation Started", {
        description: "Tournament will progress automatically"
      });
    } else {
      console.log("No unplayed matches found to start auto simulation");
      toast.error("Cannot start simulation", {
        description: "No unplayed matches available"
      });
    }
  }, [embeddedMode, matches, currentRound]);

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
