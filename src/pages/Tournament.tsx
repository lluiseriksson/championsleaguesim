import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamKitColors, TeamKit } from '../types/teamKits';
import { TournamentTeam, Match } from '../types/tournament';
import TournamentBracket from '../components/TournamentBracket';
import TournamentMatch from '../components/game/TournamentMatch';
import { Button } from '../components/ui/button';
import { Trophy, ArrowLeftCircle, RefreshCw, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Score } from '../types/football';

const teamEloRatings: Record<string, number> = {
  "Liverpool": 2010,
  "Arsenal": 1991,
  "Real Madrid": 1959,
  "Paris SG": 1946,
  "Inter": 1945,
  "Barcelona": 1926,
  "Man City": 1924,
  "Bayern": 1914,
  "Leverkusen": 1910,
  "Atlético": 1884,
  "Atalanta": 1851,
  "Chelsea": 1840,
  "Juventus": 1836,
  "Napoli": 1831,
  "Newcastle": 1822,
  "Bilbao": 1801,
  "Aston Villa": 1798,
  "Crystal Palace": 1798,
  "Lille": 1797,
  "Bournemouth": 1796,
  "Tottenham": 1795,
  "PSV": 1795,
  "Lazio": 1793,
  "Roma": 1787,
  "Benfica": 1784,
  "Brighton": 1783,
  "Forest": 1782,
  "Sporting": 1776,
  "Dortmund": 1772,
  "Fulham": 1771,
  "Milan": 1770,
  "Villarreal": 1769,
  "Bologna": 1765,
  "Brentford": 1759,
  "Man United": 1758,
  "Monaco": 1754,
  "Marseille": 1752,
  "Feyenoord": 1750,
  "Fiorentina": 1749,
  "Everton": 1746,
  "Lyon": 1738,
  "West Ham": 1736,
  "Ajax": 1725,
  "RB Leipzig": 1724,
  "Stuttgart": 1718,
  "Brugge": 1718,
  "Mainz": 1718,
  "Frankfurt": 1717,
  "Torino": 1717,
  "Real Sociedad": 1716,
  "Betis": 1714,
  "Nice": 1707,
  "Fenerbahçe": 1707,
  "Porto": 1703,
  "Leeds": 1695,
  "Slavia Praha": 1695,
  "Girona": 1689,
  "Wolfsburg": 1689,
  "Wolves": 1683,
  "Freiburg": 1679,
  "Celtic": 1679,
  "Sevilla": 1679,
  "Galatasaray": 1676,
  "Brest": 1674,
  "Strasbourg": 1673,
  "Osasuna": 1672,
  "Udinese": 1671,
  "Celta": 1671,
  "Olympiacos": 1671,
  "Burnley": 1670,
  "St Gillis": 1669,
  "Toulouse": 1668,
  "Genoa": 1665,
  "Rayo Vallecano": 1662,
  "Lens": 1660,
  "Rennes": 1658,
  "Gladbach": 1657,
  "Getafe": 1657,
  "Mallorca": 1657,
  "Braga": 1648,
  "Valencia": 1645,
  "Alkmaar": 1641,
  "Genk": 1638,
  "Zenit": 1635,
  "Sparta Praha": 1634,
  "Augsburg": 1634,
  "Sassuolo": 1629,
  "Twente": 1621,
  "Bodo/Glimt": 1619,
  "Alavés": 1619,
  "Espanyol": 1618,
  "Werder": 1618,
  "Hoffenheim": 1616,
  "Viktoria Plzen": 1614,
  "Crvena Zvezda": 1613,
  "Anderlecht": 1611,
  "Sheffield United": 1607,
  "Como": 1605,
  "FC Kobenhavn": 1602,
  "Cagliari": 1600,
  "Verona": 1600,
  "Rangers": 1600,
  "Auxerre": 1596,
  "Krasnodar": 1595,
  "Leicester": 1594,
  "Empoli": 1592,
  "Guimaraes": 1592,
  "Las Palmas": 1591,
  "Spartak Moskva": 1591,
  "Leganes": 1590,
  "Lecce": 1588,
  "Ipswich": 1583,
  "Utrecht": 1582,
  "Reims": 1579,
  "AEK": 1578,
  "Levante": 1578,
  "Union Berlin": 1577,
  "Lorient": 1575,
  "Antwerp": 1574,
  "Gent": 1571,
  "Midtjylland": 1571,
  "Huesca": 1567,
  "Monza": 1567,
  "Shakhtar": 1567,
  "Almería": 1564,
  "Parma": 1563,
  "Nantes": 1563,
  "St. Pauli": 1560
};

const getTeamElo = (teamName: string): number => {
  return teamEloRatings[teamName] || 1700;
};

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
    const tournamentTeams: TournamentTeam[] = Object.entries(teamKitColors)
      .map(([name, colors], index) => {
        const eloRating = teamEloRatings[name] || (2000 - index * 4);
        
        return {
          id: index + 1,
          name,
          seed: index + 1,
          eloRating,
          kitColors: colors
        };
      })
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
    
    const teamAStrength = currentMatch.teamA.eloRating + Math.random() * 150;
    const teamBStrength = currentMatch.teamB.eloRating + Math.random() * 150;
    
    const winner = teamAStrength > teamBStrength ? currentMatch.teamA : currentMatch.teamB;
    currentMatch.winner = winner;
    currentMatch.played = true;
    
    const eloDiff = Math.abs(teamAStrength - teamBStrength);
    const baseGoalDiff = Math.min(Math.floor(eloDiff / 100), 4);
    const randomFactor = Math.random() > 0.7 ? 1 : 0;
    const goalDiff = baseGoalDiff + randomFactor;
    
    const winnerGoals = 1 + Math.floor(Math.random() * 2) + Math.floor(goalDiff / 2);
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
      description: "Tournament will progress automatically"
    });
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
            {!autoSimulation && (
              <Button 
                onClick={startAutoSimulation}
                variant="default"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Start Auto Simulation
              </Button>
            )}
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
        <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
      </div>
      
      {playingMatch && activeMatch && activeMatch.teamA && activeMatch.teamB && !embeddedMode ? (
        <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {activeMatch.teamA.name} vs {activeMatch.teamB.name}
            </h3>
            <div className="text-sm text-gray-500">
              ELO: {activeMatch.teamA.eloRating} vs {activeMatch.teamB.eloRating}
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveMatch(null);
                setPlayingMatch(false);
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeftCircle className="h-4 w-4" />
              Back to Tournament
            </Button>
          </div>
          
          <TournamentMatch 
            homeTeam={activeMatch.teamA.name}
            awayTeam={activeMatch.teamB.name}
            homeTeamElo={activeMatch.teamA.eloRating}
            awayTeamElo={activeMatch.teamB.eloRating}
            onMatchComplete={handleMatchComplete}
            matchDuration={180}
          />
        </div>
      ) : null}
      
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
          showFullBracket={true}
        />
      </div>
    </div>
  );
};

export default Tournament;
