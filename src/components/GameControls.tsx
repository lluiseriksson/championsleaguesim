
import React from 'react';
import { Button } from "@/components/ui/button";
import { Play } from 'lucide-react';

interface GameControlsProps {
  onStartGame: (mode: 'trained-vs-trained' | 'red-vs-untrained' | 'blue-vs-untrained') => void;
}

const GameControls: React.FC<GameControlsProps> = ({ onStartGame }) => {
  return (
    <div className="flex gap-4 mb-4 justify-center">
      <Button 
        onClick={() => onStartGame('trained-vs-trained')}
        className="flex items-center gap-2"
      >
        <Play size={16} />
        IA vs IA (Entrenadas)
      </Button>
      <Button 
        onClick={() => onStartGame('red-vs-untrained')}
        variant="secondary"
        className="flex items-center gap-2"
      >
        <Play size={16} />
        IA Roja vs IA Sin Entrenar
      </Button>
      <Button 
        onClick={() => onStartGame('blue-vs-untrained')}
        variant="secondary"
        className="flex items-center gap-2"
      >
        <Play size={16} />
        IA Azul vs IA Sin Entrenar
      </Button>
    </div>
  );
};

export default GameControls;
