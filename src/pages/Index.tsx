
import React from 'react';
import KitSelector from '../components/KitSelector';

const Index = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Football Kit Selection System</h1>
      
      <div className="mb-10">
        <KitSelector />
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">About This Tool</h2>
        <p>
          This tool analyzes kit color conflicts between home and away teams and determines
          the optimal kit selection to maximize visual distinction between teams.
          It considers:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>Goalkeeper vs outfield player distinction</li>
          <li>Home team vs away team color conflicts</li>
          <li>Position-specific kit requirements</li>
          <li>Special kit generation for extreme conflict cases</li>
        </ul>
      </div>
    </div>
  );
};

export default Index;
