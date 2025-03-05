
export interface TournamentTeam {
  id: number;
  name: string;
  seed: number;
  eloRating: number;
  kitColors: TeamKit;
}

export interface Match {
  id: number;
  round: number;
  position: number;
  teamA?: TournamentTeam;
  teamB?: TournamentTeam;
  winner?: TournamentTeam;
  played: boolean;
  goldenGoal?: boolean;
  score?: {
    teamA: number;
    teamB: number;
  };
}
