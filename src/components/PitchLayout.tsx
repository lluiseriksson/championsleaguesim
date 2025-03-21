
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
      
      {/* Goal areas (6-yard box) - Made larger than the actual goals */}
      <div className="absolute left-0 top-1/2 w-16 h-[200px] border-2 border-pitch-lines transform -translate-y-1/2" />
      <div className="absolute right-0 top-1/2 w-16 h-[200px] border-2 border-pitch-lines transform -translate-y-1/2" />
      
      {/* Penalty spots */}
      <div className="absolute left-[80px] top-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute right-[80px] top-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      
      {/* Penalty arcs - left side (positioned at the edge of the penalty area) */}
      <div className="absolute left-[144px] top-1/2 w-24 h-24 border-2 border-pitch-lines rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ clipPath: 'inset(0 0 0 50%)' }} />
      
      {/* Penalty arcs - right side (positioned at the edge of the penalty area) */}
      <div className="absolute right-[144px] top-1/2 w-24 h-24 border-2 border-pitch-lines rounded-full transform translate-x-1/2 -translate-y-1/2" style={{ clipPath: 'inset(0 50% 0 0)' }} />
      
      {/* Corner arcs - positioned correctly at each corner as quarter circles */}
      {/* Top left corner */}
      <div className="absolute left-0 top-0">
        <div className="absolute left-0 top-0 w-20 h-20 border-2 border-pitch-lines rounded-full" 
             style={{ clipPath: 'polygon(0% 0%, 20px 0%, 0% 20px)' }} />
      </div>
      
      {/* Top right corner */}
      <div className="absolute right-0 top-0">
        <div className="absolute right-0 top-0 w-20 h-20 border-2 border-pitch-lines rounded-full" 
             style={{ clipPath: 'polygon(100% 0%, 100% 20px, calc(100% - 20px) 0%)' }} />
      </div>
      
      {/* Bottom left corner */}
      <div className="absolute left-0 bottom-0">
        <div className="absolute left-0 bottom-0 w-20 h-20 border-2 border-pitch-lines rounded-full" 
             style={{ clipPath: 'polygon(0% 100%, 20px 100%, 0% calc(100% - 20px))' }} />
      </div>
      
      {/* Bottom right corner */}
      <div className="absolute right-0 bottom-0">
        <div className="absolute right-0 bottom-0 w-20 h-20 border-2 border-pitch-lines rounded-full" 
             style={{ clipPath: 'polygon(100% 100%, calc(100% - 20px) 100%, 100% calc(100% - 20px))' }} />
      </div>
    </div>
  );
};

export default PitchLayout;
