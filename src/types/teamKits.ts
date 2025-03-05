export type TeamKit = {
  home: string;
  away: string;
  third: string;
};

export type TeamColors = {
  [key: string]: TeamKit;
};

export const teamKitColors: TeamColors = {
  "Liverpool": { home: "#FF0000", away: "#006400", third: "#FFFFFF" },
  "Arsenal": { home: "#FF0000", away: "#FFFF00", third: "#00FFFF" },
  "Real Madrid": { home: "#FFFFFF", away: "#00008B", third: "#36454F" },
  "Inter": { home: "#000000", away: "#FFFFFF", third: "#FFD700" },
  "Paris SG": { home: "#FF0000", away: "#FFFFFF", third: "#B76E79" },
  "Barcelona": { home: "#0000FF", away: "#000000", third: "#FFFFE0" },
  "Man City": { home: "#87CEEB", away: "#FFFFFF", third: "#800020" },
  "Bayern": { home: "#FF0000", away: "#008000", third: "#FAF0E6" },
  "Leverkusen": { home: "#FF0000", away: "#FFFFFF", third: "#008000" },
  "Atlético": { home: "#FF0000", away: "#00008B", third: "#FFFF00" },
  "Atalanta": { home: "#0000FF", away: "#FFFFFF", third: "#FF0000" },
  "Juventus": { home: "#000000", away: "#FFC0CB", third: "#000000" },
  "Chelsea": { home: "#0000FF", away: "#FFFFFF", third: "#FFA500" },
  "Napoli": { home: "#87CEEB", away: "#FFFFFF", third: "#EE82EE" },
  "Newcastle": { home: "#000000", away: "#3EB489", third: "#000080" },
  "PSV": { home: "#FF0000", away: "#000000", third: "#FFFF00" },
  "Bilbao": { home: "#FF0000", away: "#000000", third: "#008000" },
  "Lille": { home: "#FFA500", away: "#FFFFFF", third: "#808080" },
  "Crystal Palace": { home: "#FF0000", away: "#FFFFFF", third: "#008000" },
  "Lazio": { home: "#87CEEB", away: "#FFFFFF", third: "#000000" },
  "Bournemouth": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Tottenham": { home: "#FFFFFF", away: "#000080", third: "#FFFF00" },
  "Roma": { home: "#FF0000", away: "#FFFFFF", third: "#000000" },
  "Benfica": { home: "#FF0000", away: "#000000", third: "#008000" },
  "Aston Villa": { home: "#800020", away: "#FFFFFF", third: "#FFFF00" },
  "Brighton": { home: "#0000FF", away: "#000000", third: "#008000" },
  "Forest": { home: "#FF0000", away: "#000080", third: "#000000" },
  "Sporting": { home: "#008000", away: "#000000", third: "#FFFF00" },
  "Dortmund": { home: "#FFFF00", away: "#FFFFFF", third: "#40E0D0" },
  "Milan": { home: "#FF0000", away: "#FFFFFF", third: "#008000" },
  "Villarreal": { home: "#FFFF00", away: "#00008B", third: "#000000" },
  "Fulham": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Bologna": { home: "#FF0000", away: "#FFFFFF", third: "#FFFF00" },
  "Brentford": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Monaco": { home: "#FF0000", away: "#FFFFFF", third: "#000000" },
  "Man United": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Feyenoord": { home: "#FF0000", away: "#000000", third: "#008000" },
  "Marseille": { home: "#FFFFFF", away: "#000000", third: "#FFC0CB" },
  "Fiorentina": { home: "#800080", away: "#FFFFFF", third: "#000000" },
  "Everton": { home: "#0000FF", away: "#FFFFFF", third: "#FFFF00" },
  "Lyon": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "West Ham": { home: "#A52A2A", away: "#FFFFFF", third: "#008000" },
  "Brugge": { home: "#0000FF", away: "#FFFFFF", third: "#FFFF00" },
  "Ajax": { home: "#FFFFFF", away: "#000000", third: "#008000" },
  "RB Leipzig": { home: "#FFFFFF", away: "#00008B", third: "#000000" },
  "Stuttgart": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Mainz": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Frankfurt": { home: "#FF0000", away: "#FFFFFF", third: "#008000" },
  "Torino": { home: "#800000", away: "#00008B", third: "#FFFF00" },
  "Real Sociedad": { home: "#FFFFFF", away: "#000000", third: "#FF0000" },
  "Betis": { home: "#008000", away: "#000000", third: "#0000FF" },
  "Fenerbahçe": { home: "#FFFF00", away: "#FFFFFF", third: "#FF0000" },
  "Nice": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Porto": { home: "#0000FF", away: "#000000", third: "#FFFF00" },
  "Slavia Praha": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Leeds": { home: "#FFFFFF", away: "#FFFF00", third: "#000000" },
  "Wolfsburg": { home: "#008000", away: "#000000", third: "#0000FF" },
  "Girona": { home: "#FF0000", away: "#00008B", third: "#000000" },
  "Freiburg": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Celtic": { home: "#008000", away: "#000000", third: "#FFFF00" },
  "Sevilla": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Wolves": { home: "#FFD700", away: "#FFFFFF", third: "#FF0000" },
  "Galatasaray": { home: "#FFFF00", away: "#FFFFFF", third: "#000000" },
  "Brest": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "St Gillis": { home: "#FFFFFF", away: "#000000", third: "#FF0000" },
  "Osasuna": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Strasbourg": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Udinese": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Celta": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Olympiacos": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Toulouse": { home: "#EE82EE", away: "#000000", third: "#0000FF" },
  "Genoa": { home: "#FF0000", away: "#FFFFFF", third: "#000000" },
  "Rayo Vallecano": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Burnley": { home: "#A52A2A", away: "#FFFFFF", third: "#008000" },
  "Lens": { home: "#FFA500", away: "#FFFFFF", third: "#0000FF" },
  "Gladbach": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Getafe": { home: "#0000FF", away: "#FFFFFF", third: "#000000" },
  "Rennes": { home: "#FF0000", away: "#FFFFFF", third: "#FFD700" },
  "Mallorca": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Braga": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Valencia": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Alkmaar": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Genk": { home: "#FFFFFF", away: "#000000", third: "#FF0000" },
  "Zenit": { home: "#0000FF", away: "#000000", third: "#0000FF" },
  "Augsburg": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Sparta Praha": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Sassuolo": { home: "#000000", away: "#FFFFFF", third: "#0000FF" },
  "Twente": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Bodø/Glimt": { home: "#FFFF00", away: "#FFFFFF", third: "#0000FF" },
  "Alavés": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Werder": { home: "#008000", away: "#000000", third: "#0000FF" },
  "Espanyol": { home: "#FFFFFF", away: "#000000", third: "#FF0000" },
  "Hoffenheim": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Anderlecht": { home: "#800080", away: "#000000", third: "#0000FF" },
  "Viktoria Plzeň": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Crvena Zvezda": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Como": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Sheffield United": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "FC København": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Cagliari": { home: "#FF0000", away: "#FFFFFF", third: "#000000" },
  "Verona": { home: "#FFFF00", away: "#FFFFFF", third: "#000000" },
  "Rangers": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Krasnodar": { home: "#000000", away: "#FFFFFF", third: "#0000FF" },
  "Auxerre": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Empoli": { home: "#0000FF", away: "#FFFFFF", third: "#000000" },
  "Guimarães": { home: "#FFFFFF", away: "#000000", third: "#0000FF" },
  "Las Palmas": { home: "#FFFF00", away: "#FFFFFF", third: "#000000" },
  "Spartak Moskva": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Leganés": { home: "#FFFFFF", away: "#000000", third: "#FF0000" },
  "Leicester": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Lecce": { home: "#FFFF00", away: "#FFFFFF", third: "#000000" },
  "Utrecht": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "AEK": { home: "#FFFF00", away: "#FFFFFF", third: "#0000FF" },
  "Reims": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Levante": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Antwerp": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Ipswich": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Union Berlin": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Lorient": { home: "#FFA500", away: "#FFFFFF", third: "#0000FF" },
  "Gent": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Midtjylland": { home: "#FF0000", away: "#FFFFFF", third: "#0000FF" },
  "Huesca": { home: "#0000FF", away: "#000000", third: "#FF0000" },
  "Monza": { home: "#FF0000", away: "#000000", third: "#0000FF" },
  "Shakhtar": { home: "#FFA500", away: "#FFFFFF", third: "#0000FF" },
  "Almería": { home: "#FF0000", away: "#000000", third: "#008000" },
  "Parma": { home: "#FFFF00", away: "#FFFFFF", third: "#000000" },
  "Nantes": { home: "#FFFF00", away: "#FFFFFF", third: "#0000FF" },
  "St. Pauli": { home: "#FFFFFF", away: "#000000", third: "#FF0000" }
};

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): string => {
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    // Fallback colors if teams not found
    return !homeTeam || homeTeam.home === "#FF0000" ? "#0000FF" : "#FF0000";
  }

  // If home team's primary color is different from away team's primary, use away team's primary
  if (homeTeam.home !== awayTeam.home) {
    return awayTeam.home;
  }

  // Otherwise use away kit
  return awayTeam.away;
};

// Function to get team kit color based on the team name and kit type
export const getTeamKitColor = (teamName: string | undefined, kitType: 'home' | 'away' | 'third' = 'home'): string => {
  if (!teamName || !teamKitColors[teamName]) {
    // Default fallback colors
    return kitType === 'home' ? '#FF0000' : 
           kitType === 'away' ? '#0000FF' : '#FFFFFF';
  }
  
  return teamKitColors[teamName][kitType];
};
