
export type KitType = 'home' | 'away' | 'third' | 'special';

export type TeamKitColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TeamKit = {
  home: TeamKitColors;
  away: TeamKitColors;
  third: TeamKitColors;
};

export type TeamColors = {
  [key: string]: TeamKit;
};
