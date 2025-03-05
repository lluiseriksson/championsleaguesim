
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
              <span>Tournament</span>
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 space-y-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <FootballPitch />
        </div>
        
        {/* Tournament section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Football Tournament</h2>
            <Link to="/tournament" className="text-blue-600 hover:underline">View Full Tournament</Link>
          </div>
          <Tournament embeddedMode={true} />
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>AI Football Simulator - Neural Network Powered</p>
      </footer>
    </div>
  );
};

export default Index;
