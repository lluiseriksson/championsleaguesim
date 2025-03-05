<<<<<<< HEAD
// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-gray-600">Start building your amazing project here!</p>
=======

import React from 'react';
import FootballPitch from '@/components/FootballPitch';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pixel Football Simulation</h1>
          <p className="text-gray-600">A minimalist 2D football match simulation</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <FootballPitch />
        </div>
>>>>>>> pixelfootball/main
      </div>
    </div>
  );
};

export default Index;
