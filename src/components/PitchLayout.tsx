
import React from 'react';
import { GOAL_HEIGHT } from '../types/football';

const PitchLayout: React.FC = () => {
  return (
    <div className="absolute inset-0">
      {/* Center circle and center spot */}
      <div className="absolute left-1/2 top-1/2 w-32 h-32 border-2 border-pitch-lines rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      
      {/* Center line */}
      <div className="absolute left-1/2 top-0 w-0.5 h-full bg-pitch-lines transform -translate-x-1/2" />
      
      {/* Goals */}
      <div className="absolute left-0 top-1/2 w-4 h-[184px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
      <div className="absolute right-0 top-1/2 w-4 h-[184px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
      
      {/* Penalty areas (18-yard box) */}
      <div className="absolute left-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
      <div className="absolute right-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
      
      {/* Goal areas (6-yard box) - no arcs here */}
      <div className="absolute left-0 top-1/2 w-16 h-36 border-2 border-pitch-lines transform -translate-y-1/2" />
      <div className="absolute right-0 top-1/2 w-16 h-36 border-2 border-pitch-lines transform -translate-y-1/2" />
      
      {/* Penalty arc for left penalty area */}
      <div 
        className="absolute left-[36px] top-1/2 w-48 h-48 border-2 border-pitch-lines rounded-full"
        style={{ 
          clipPath: 'polygon(0% 25%, 50% 25%, 50% 75%, 0% 75%)',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* Penalty arc for right penalty area */}
      <div 
        className="absolute right-[36px] top-1/2 w-48 h-48 border-2 border-pitch-lines rounded-full"
        style={{ 
          clipPath: 'polygon(50% 25%, 100% 25%, 100% 75%, 50% 75%)',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* Penalty spots - positioned further from goal */}
      <div className="absolute left-[80px] top-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute right-[80px] top-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      
      {/* Corner arcs - top left */}
      <div className="absolute left-0 top-0 w-10 h-10 border-r-2 border-b-2 border-pitch-lines rounded-br-[10px]" />
      
      {/* Corner arcs - top right */}
      <div className="absolute right-0 top-0 w-10 h-10 border-l-2 border-b-2 border-pitch-lines rounded-bl-[10px]" />
      
      {/* Corner arcs - bottom left */}
      <div className="absolute left-0 bottom-0 w-10 h-10 border-r-2 border-t-2 border-pitch-lines rounded-tr-[10px]" />
      
      {/* Corner arcs - bottom right */}
      <div className="absolute right-0 bottom-0 w-10 h-10 border-l-2 border-t-2 border-pitch-lines rounded-tl-[10px]" />
    </div>
  );
};

export default PitchLayout;
