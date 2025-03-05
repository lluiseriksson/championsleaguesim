
import React from 'react';
import PlayerInitializer from './PlayerInitializer';
import { Player } from '../../types/football';
import { Skeleton } from '../ui/skeleton';

interface LoadingStateProps {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setGameReady: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoadingState: React.FC<LoadingStateProps> = ({ setPlayers, setGameReady }) => {
  return (
    <div className="w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg flex items-center justify-center flex-col gap-4">
      <div className="text-white text-2xl">Loading game...</div>
      <div className="flex gap-2">
        <Skeleton className="w-4 h-4 rounded-full bg-white/20" />
        <Skeleton className="w-4 h-4 rounded-full bg-white/20" />
        <Skeleton className="w-4 h-4 rounded-full bg-white/20" />
      </div>
      <PlayerInitializer setPlayers={setPlayers} setGameReady={setGameReady} />
    </div>
  );
};

export default LoadingState;
