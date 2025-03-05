
import React, { createContext, useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Player, Ball, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../../../types/football';

export interface MatchContextType {
  players: Player[];
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  ball: Ball;
  setBall: Dispatch<SetStateAction<Ball>>;
  score: Score;
  setScore: Dispatch<SetStateAction<Score>>;
  gameStarted: boolean;
  matchEnded: boolean;
  setMatchEnded: Dispatch<SetStateAction<boolean>>;
  goldenGoal: boolean;
  setGoldenGoal: Dispatch<SetStateAction<boolean>>;
  lastScorer: 'red' | 'blue' | null;
  setLastScorer: Dispatch<SetStateAction<'red' | 'blue' | null>>;
  homeTeam: string;
  awayTeam: string;
}

const MatchContext = createContext<MatchContextType | null>(null);

export const useMatchContext = () => {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatchContext must be used within a MatchProvider');
  }
  return context;
};

interface MatchProviderProps {
  children: React.ReactNode;
  homeTeam: string;
  awayTeam: string;
}

export const MatchProvider: React.FC<MatchProviderProps> = ({ children, homeTeam, awayTeam }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ball, setBall] = useState<Ball>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: Math.random() > 0.5 ? 3 : -3, y: (Math.random() - 0.5) * 3 },
    bounceDetection: {
      consecutiveBounces: 0,
      lastBounceTime: 0,
      lastBounceSide: '',
      sideEffect: false
    }
  });
  
  const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
  const [gameStarted, setGameStarted] = useState(true);
  const [matchEnded, setMatchEnded] = useState(false);
  const [goldenGoal, setGoldenGoal] = useState(false);
  const [lastScorer, setLastScorer] = useState<'red' | 'blue' | null>(null);

  return (
    <MatchContext.Provider
      value={{
        players,
        setPlayers,
        ball,
        setBall,
        score,
        setScore,
        gameStarted,
        matchEnded,
        setMatchEnded,
        goldenGoal,
        setGoldenGoal,
        lastScorer,
        setLastScorer,
        homeTeam,
        awayTeam
      }}
    >
      {children}
    </MatchContext.Provider>
  );
};
