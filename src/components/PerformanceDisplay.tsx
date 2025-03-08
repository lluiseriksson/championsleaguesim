
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface TeamPerformanceMetrics {
  goals: number;
  shots: number;
  passes: number;
  passAccuracy: number;
  possession: number;
  successfulActions: number;
  totalActions: number;
}

interface PerformanceDisplayProps {
  redTeamMetrics: TeamPerformanceMetrics;
  blueTeamMetrics: TeamPerformanceMetrics;
  homeTeamLearning: boolean;
  awayTeamLearning: boolean;
}

const PerformanceDisplay: React.FC<PerformanceDisplayProps> = ({
  redTeamMetrics,
  blueTeamMetrics,
  homeTeamLearning,
  awayTeamLearning
}) => {
  const calculateEfficiency = (metrics: TeamPerformanceMetrics) => {
    return metrics.totalActions > 0 
      ? (metrics.successfulActions / metrics.totalActions) * 100 
      : 0;
  };

  // Calculate improvement metrics
  const redEfficiency = calculateEfficiency(redTeamMetrics);
  const blueEfficiency = calculateEfficiency(blueTeamMetrics);

  return (
    <Card className="w-full max-w-lg mx-auto my-4 shadow-md">
      <CardHeader>
        <CardTitle className="text-center">Neural Network Performance Comparison</CardTitle>
        <CardDescription className="text-center">
          Home (Red): {homeTeamLearning ? "Learning Enabled" : "Not Learning"} vs 
          Away (Blue): {awayTeamLearning ? "Learning Enabled" : "Not Learning"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-right font-medium text-red-600">Home (Red)</div>
            <div className="text-center font-medium">Metric</div>
            <div className="text-left font-medium text-blue-600">Away (Blue)</div>
          </div>
          
          <Separator />

          {/* Goals */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-right">{redTeamMetrics.goals}</div>
            <div className="text-center text-sm text-muted-foreground">Goals</div>
            <div className="text-left">{blueTeamMetrics.goals}</div>
          </div>

          {/* Shots */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-right">{redTeamMetrics.shots}</div>
            <div className="text-center text-sm text-muted-foreground">Shots</div>
            <div className="text-left">{blueTeamMetrics.shots}</div>
          </div>

          {/* Passes */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-right">{redTeamMetrics.passes}</div>
            <div className="text-center text-sm text-muted-foreground">Passes</div>
            <div className="text-left">{blueTeamMetrics.passes}</div>
          </div>

          {/* Pass Accuracy */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-right">{redTeamMetrics.passAccuracy.toFixed(1)}%</div>
            <div className="text-center text-sm text-muted-foreground">Pass Accuracy</div>
            <div className="text-left">{blueTeamMetrics.passAccuracy.toFixed(1)}%</div>
          </div>

          {/* Possession */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-right">{redTeamMetrics.possession.toFixed(1)}%</div>
            <div className="text-center text-sm text-muted-foreground">Possession</div>
            <div className="text-left">{blueTeamMetrics.possession.toFixed(1)}%</div>
          </div>

          {/* Action Success Rate */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-right">{redEfficiency.toFixed(1)}%</div>
            <div className="text-center text-sm text-muted-foreground">Success Rate</div>
            <div className="text-left">{blueEfficiency.toFixed(1)}%</div>
          </div>

          {/* Visual comparison of efficiency */}
          <div className="pt-4">
            <div className="text-sm font-medium mb-2">Overall Efficiency</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-red-600">Home (Red) {homeTeamLearning ? "✓ Learning" : ""}</div>
                <Progress value={redEfficiency} className="h-2 bg-red-100" indicatorClassName="bg-red-600" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-blue-600">Away (Blue) {awayTeamLearning ? "✓ Learning" : ""}</div>
                <Progress value={blueEfficiency} className="h-2 bg-blue-100" indicatorClassName="bg-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceDisplay;
