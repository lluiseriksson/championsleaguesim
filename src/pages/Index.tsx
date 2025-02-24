
import React from 'react';
import FootballPitch from '@/components/FootballPitch';
import GameControls from '@/components/GameControls';

const Index = () => {
  const pitchRef = React.useRef<{ initializePlayers: (mode: 'trained-vs-trained' | 'red-vs-untrained' | 'blue-vs-untrained') => void }>(null);

  const handleStartGame = (mode: 'trained-vs-trained' | 'red-vs-untrained' | 'blue-vs-untrained') => {
    if (pitchRef.current) {
      pitchRef.current.initializePlayers(mode);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pixel Football Simulation</h1>
          <p className="text-gray-600">A minimalist 2D football match simulation</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <GameControls onStartGame={handleStartGame} />
          <FootballPitch ref={pitchRef} />
        </div>
      </div>
    </div>
  );
};

export default Index;
