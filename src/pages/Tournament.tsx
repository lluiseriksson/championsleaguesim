import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamKitColors, TeamKit } from '../types/teamKits';
import { TournamentTeam, Match } from '../types/tournament';
import TournamentBracket from '../components/TournamentBracket';
import TournamentMatch from '../components/game/TournamentMatch';
import { Button } from '../components/ui/button';
import { Trophy, ArrowLeftCircle, RefreshCw, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { Score } from '../types/football';

interface TournamentProps {
  embeddedMode?: boolean;
}

const Tournament: React.FC<TournamentProps> = ({ embeddedMode = false }) => {
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

    const awayTeams = [...tournamentTeams.slice(64)];
    for (let i = awayTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [awayTeams[i], awayTeams[j]] = [awayTeams[j], awayTeams[i]];
    }

    for (let i = 0; i < 64; i++) {
      const match = initialMatches.find(m => m.round === 1 && m.position === i + 1);
      if (match) {
        match.teamA = tournamentTeams[i];
        match.teamB = awayTeams[i];
      }
    }

    setMatches(initialMatches);
    setCurrentRound(1);
    
    toast.success("Tournament initialized", {
      description: "128 teams ready for the competition"
    });
  };

  const resetTournament = () => {
    setActiveMatch(null);
    setPlayingMatch(false);
    setInitialized(false);
    setAutoSimulation(false);
    
    toast("Tournament reset", {
      description: "New random matchups have been created"
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

  const handleMatchComplete = (winnerName: string, finalScore: Score) => {
    if (!activeMatch) return;
    
    const updatedMatches = [...matches];
    const currentMatch = updatedMatches.find(m => m.id === activeMatch.id);
    
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;
    
    const winner = winnerName === currentMatch.teamA.name 
      ? currentMatch.teamA 
      : currentMatch.teamB;
    
    currentMatch.winner = winner;
    currentMatch.played = true;
    currentMatch.score = {
      teamA: currentMatch.teamA.name === winnerName ? finalScore.red : finalScore.blue,
      teamB: currentMatch.teamB.name === winnerName ? finalScore.red : finalScore.blue
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

  const toggleAutoSimulation = () => {
    setAutoSimulation(prev => !prev);
    
    if (!autoSimulation) {
      toast.success("Auto Simulation Enabled", {
        description: "Tournament will progress automatically"
      });
    } else {
      toast.info("Auto Simulation Disabled", {
        description: "Tournament progress paused"
      });
    }
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

  if (playingMatch && activeMatch && activeMatch.teamA && activeMatch.teamB && !embeddedMode) {
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
          matchDuration={180}
        />
      </div>
    );
  }

  if (embeddedMode) {
    return (
      <div className="tournament-embedded">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{getTournamentStatus()}</h2>
          <div className="flex gap-2">
            <Button 
              onClick={resetTournament}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </Button>
            <Button 
              onClick={toggleAutoSimulation}
              variant={autoSimulation ? "destructive" : "default"}
              size="sm"
              className={`flex items-center gap-1 ${!autoSimulation ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {autoSimulation ? (
                <>
                  <Pause className="h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Simulate
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <TournamentBracket 
            matches={matches} 
            onMatchClick={(match) => {
              if (!autoSimulation && match.teamA && match.teamB && !match.played) {
                if (embeddedMode) {
                  simulateSingleMatch(match);
                } else {
                  playMatch(match);
                }
              }
            }}
          />
        </div>
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
              onClick={resetTournament}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Tournament
            </Button>
            <Button 
              onClick={toggleAutoSimulation}
              variant={autoSimulation ? "destructive" : "default"}
              className={`flex items-center gap-2 ${!autoSimulation ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {autoSimulation ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause Auto Simulation
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Auto Simulation
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center text-amber-500 font-bold gap-2">
              <Trophy className="h-6 w-6" />
              <span>Champion: {getWinner()?.name}</span>
            </div>
            <Button 
              onClick={resetTournament}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Tournament
            </Button>
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
            if (!autoSimulation && match.teamA && match.teamB && !match.played) {
              playMatch(match);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Tournament;
