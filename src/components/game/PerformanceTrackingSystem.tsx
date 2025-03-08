import React, { useState, useRef, useEffect } from 'react';
import { Player, Score, Ball } from '../../types/football';

interface TeamPerformanceMetrics {
  goals: number;
  shots: number;
  passes: number;
  passAccuracy: number;
  possession: number;
  successfulActions: number;
  totalActions: number;
}

interface PerformanceTrackingProps {
  players: Player[];
  ball: Ball;
  score: Score;
  lastPlayerTouchRef: React.MutableRefObject<Player | null>;
}

export const usePerformanceTrackingSystem = ({
  players,
  ball,
  score,
  lastPlayerTouchRef
}: PerformanceTrackingProps) => {
  const [redTeamMetrics, setRedTeamMetrics] = useState<TeamPerformanceMetrics>({
    goals: 0,
    shots: 0,
    passes: 0,
    passAccuracy: 0,
    possession: 0,
    successfulActions: 0,
    totalActions: 0
  });
  
  const [blueTeamMetrics, setBlueTeamMetrics] = useState<TeamPerformanceMetrics>({
    goals: 0,
    shots: 0,
    passes: 0,
    passAccuracy: 0,
    possession: 0,
    successfulActions: 0,
    totalActions: 0
  });

  const possessionTimeRef = useRef({ red: 0, blue: 0 });
  const lastTeamInPossessionRef = useRef<'red' | 'blue' | null>(null);
  const actionsCounterRef = useRef({
    red: { successful: 0, total: 0 },
    blue: { successful: 0, total: 0 }
  });
  
  // Track team in possession
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (lastPlayerTouchRef.current) {
        const team = lastPlayerTouchRef.current.team;
        lastTeamInPossessionRef.current = team;
        possessionTimeRef.current[team] += 1;
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [lastPlayerTouchRef]);

  // Update metrics every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      const redPlayers = players.filter(p => p.team === 'red');
      const bluePlayers = players.filter(p => p.team === 'blue');
      
      // Calculate possession percentage
      const totalPossessionTime = possessionTimeRef.current.red + possessionTimeRef.current.blue;
      const redPossession = totalPossessionTime > 0 
        ? (possessionTimeRef.current.red / totalPossessionTime) * 100 
        : 50;
      const bluePossession = totalPossessionTime > 0 
        ? (possessionTimeRef.current.blue / totalPossessionTime) * 100 
        : 50;
      
      // Calculate pass accuracy
      const redPassAccuracy = actionsCounterRef.current.red.total > 0
        ? (actionsCounterRef.current.red.successful / actionsCounterRef.current.red.total) * 100
        : 0;
      
      const bluePassAccuracy = actionsCounterRef.current.blue.total > 0
        ? (actionsCounterRef.current.blue.successful / actionsCounterRef.current.blue.total) * 100
        : 0;
      
      // Update metrics
      setRedTeamMetrics(prev => ({
        ...prev,
        goals: score.red,
        possession: redPossession,
        passAccuracy: redPassAccuracy,
        successfulActions: actionsCounterRef.current.red.successful,
        totalActions: actionsCounterRef.current.red.total
      }));
      
      setBlueTeamMetrics(prev => ({
        ...prev,
        goals: score.blue,
        possession: bluePossession,
        passAccuracy: bluePassAccuracy,
        successfulActions: actionsCounterRef.current.blue.successful,
        totalActions: actionsCounterRef.current.blue.total
      }));
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [players, score]);

  // Function to record player actions
  const recordAction = (player: Player, actionType: string, success: boolean) => {
    if (player.team === 'red') {
      if (actionType === 'shot') {
        setRedTeamMetrics(prev => ({
          ...prev,
          shots: prev.shots + 1
        }));
      } else if (actionType === 'pass') {
        setRedTeamMetrics(prev => ({
          ...prev,
          passes: prev.passes + 1
        }));
      }
      
      actionsCounterRef.current.red.total += 1;
      if (success) {
        actionsCounterRef.current.red.successful += 1;
      }
    } else {
      if (actionType === 'shot') {
        setBlueTeamMetrics(prev => ({
          ...prev,
          shots: prev.shots + 1
        }));
      } else if (actionType === 'pass') {
        setBlueTeamMetrics(prev => ({
          ...prev,
          passes: prev.passes + 1
        }));
      }
      
      actionsCounterRef.current.blue.total += 1;
      if (success) {
        actionsCounterRef.current.blue.successful += 1;
      }
    }
  };

  // Reset metrics function
  const resetMetrics = () => {
    setRedTeamMetrics({
      goals: 0,
      shots: 0,
      passes: 0,
      passAccuracy: 0,
      possession: 0,
      successfulActions: 0,
      totalActions: 0
    });
    
    setBlueTeamMetrics({
      goals: 0,
      shots: 0,
      passes: 0,
      passAccuracy: 0,
      possession: 0,
      successfulActions: 0,
      totalActions: 0
    });
    
    possessionTimeRef.current = { red: 0, blue: 0 };
    actionsCounterRef.current = {
      red: { successful: 0, total: 0 },
      blue: { successful: 0, total: 0 }
    };
  };

  return {
    redTeamMetrics,
    blueTeamMetrics,
    recordAction,
    resetMetrics
  };
};
