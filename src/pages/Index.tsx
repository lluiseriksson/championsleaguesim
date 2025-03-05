
import React from 'react';
import { Link } from 'react-router-dom';
import FootballPitch from '../components/FootballPitch';
import Tournament from './Tournament';
import { Button } from '../components/ui/button';
import { Trophy } from 'lucide-react';

const Index = () => {
  return (
    <div className="relative min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Football Simulator</h1>
          <Link to="/tournament">
            <Button variant="outline" className="bg-white text-green-700 hover:bg-green-100 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Full Tournament</span>
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 space-y-8">
        {/* Descripción del juego */}
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-lg text-gray-800">
            Bienvenido al AI Football Simulator, un simulador de fútbol impulsado por redes neuronales donde los equipos compiten en tiempo real. Los jugadores virtuales aprenden y mejoran con cada partido, adaptando sus estrategias mientras compiten por la gloria en un emocionante torneo mundial. Observa cómo equipos de todo el mundo se enfrentan en partidos dinámicos con física realista y tácticas emergentes desarrolladas por inteligencia artificial.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <FootballPitch />
        </div>
        
        {/* Tournament section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Football Tournament</h2>
            <Link to="/tournament" className="text-blue-600 hover:underline">View Full Tournament</Link>
          </div>
          <div className="overflow-x-auto mb-6">
            <Tournament embeddedMode={true} />
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>AI Football Simulator - Neural Network Powered</p>
      </footer>
    </div>
  );
};

export default Index;
