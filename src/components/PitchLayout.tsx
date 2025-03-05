
import React from 'react';

const PitchLayout: React.FC = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-1/2 top-1/2 w-32 h-32 border-2 border-pitch-lines rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute left-1/2 top-0 w-0.5 h-full bg-pitch-lines transform -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-4 h-[160px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
      <div className="absolute right-0 top-1/2 w-4 h-[160px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
      <div className="absolute left-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
      <div className="absolute right-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
    </div>
  );
};

export default PitchLayout;
