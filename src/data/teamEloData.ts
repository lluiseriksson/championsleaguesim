
// Datos de ELO reales para equipos
export interface TeamEloData {
  name: string;
  elo: number;
  country: string;
}

export const teamEloRatings: TeamEloData[] = [
  { name: "Liverpool", elo: 2010, country: "ENG" },
  { name: "Arsenal", elo: 1991, country: "ENG" },
  { name: "Real Madrid", elo: 1959, country: "ESP" },
  { name: "Paris SG", elo: 1946, country: "FRA" },
  { name: "Inter", elo: 1945, country: "ITA" },
  { name: "Barcelona", elo: 1926, country: "ESP" },
  { name: "Man City", elo: 1924, country: "ENG" },
  { name: "Bayern", elo: 1914, country: "GER" },
  { name: "Leverkusen", elo: 1910, country: "GER" },
  { name: "Atlético", elo: 1884, country: "ESP" },
  { name: "Atalanta", elo: 1851, country: "ITA" },
  { name: "Chelsea", elo: 1840, country: "ENG" },
  { name: "Juventus", elo: 1836, country: "ITA" },
  { name: "Napoli", elo: 1831, country: "ITA" },
  { name: "Newcastle", elo: 1822, country: "ENG" },
  { name: "Bilbao", elo: 1801, country: "ESP" },
  { name: "Aston Villa", elo: 1798, country: "ENG" },
  { name: "Crystal Palace", elo: 1798, country: "ENG" },
  { name: "Lille", elo: 1797, country: "FRA" },
  { name: "Bournemouth", elo: 1796, country: "ENG" },
  { name: "Tottenham", elo: 1795, country: "ENG" },
  { name: "PSV", elo: 1795, country: "NED" },
  { name: "Lazio", elo: 1793, country: "ITA" },
  { name: "Roma", elo: 1787, country: "ITA" },
  { name: "Benfica", elo: 1784, country: "POR" },
  { name: "Brighton", elo: 1783, country: "ENG" },
  { name: "Forest", elo: 1782, country: "ENG" },
  { name: "Sporting", elo: 1776, country: "POR" },
  { name: "Dortmund", elo: 1772, country: "GER" },
  { name: "Fulham", elo: 1771, country: "ENG" },
  { name: "Milan", elo: 1770, country: "ITA" },
  { name: "Villarreal", elo: 1769, country: "ESP" },
  { name: "Bologna", elo: 1765, country: "ITA" },
  { name: "Brentford", elo: 1759, country: "ENG" },
  { name: "Man United", elo: 1758, country: "ENG" },
  { name: "Monaco", elo: 1754, country: "FRA" },
  { name: "Marseille", elo: 1752, country: "FRA" },
  { name: "Feyenoord", elo: 1750, country: "NED" },
  { name: "Fiorentina", elo: 1749, country: "ITA" },
  { name: "Everton", elo: 1746, country: "ENG" },
  { name: "Lyon", elo: 1738, country: "FRA" },
  { name: "West Ham", elo: 1736, country: "ENG" },
  { name: "Ajax", elo: 1725, country: "NED" },
  { name: "RB Leipzig", elo: 1724, country: "GER" },
  { name: "Stuttgart", elo: 1718, country: "GER" },
  { name: "Brugge", elo: 1718, country: "BEL" },
  { name: "Mainz", elo: 1718, country: "GER" },
  { name: "Frankfurt", elo: 1717, country: "GER" },
  { name: "Torino", elo: 1717, country: "ITA" },
  { name: "Real Sociedad", elo: 1716, country: "ESP" },
  { name: "Betis", elo: 1714, country: "ESP" },
  { name: "Nice", elo: 1707, country: "FRA" },
  { name: "Fenerbahçe", elo: 1707, country: "TUR" },
  { name: "Porto", elo: 1703, country: "POR" },
  { name: "Leeds", elo: 1695, country: "ENG" },
  { name: "Slavia Praha", elo: 1695, country: "CZE" },
  { name: "Girona", elo: 1689, country: "ESP" },
  { name: "Wolfsburg", elo: 1689, country: "GER" },
  { name: "Wolves", elo: 1683, country: "ENG" },
  { name: "Freiburg", elo: 1679, country: "GER" },
  { name: "Celtic", elo: 1679, country: "SCO" },
  { name: "Sevilla", elo: 1679, country: "ESP" },
  { name: "Galatasaray", elo: 1676, country: "TUR" },
  { name: "Brest", elo: 1674, country: "FRA" },
  { name: "Strasbourg", elo: 1673, country: "FRA" },
  { name: "Osasuna", elo: 1672, country: "ESP" },
  { name: "Udinese", elo: 1671, country: "ITA" },
  { name: "Celta", elo: 1671, country: "ESP" },
  { name: "Ολυμπιακός", elo: 1671, country: "GRE" },
  { name: "Burnley", elo: 1670, country: "ENG" },
  { name: "St Gillis", elo: 1669, country: "BEL" },
  { name: "Toulouse", elo: 1668, country: "FRA" },
  { name: "Genoa", elo: 1665, country: "ITA" },
  { name: "Rayo Vallecano", elo: 1662, country: "ESP" },
  { name: "Lens", elo: 1660, country: "FRA" },
  { name: "Rennes", elo: 1658, country: "FRA" },
  { name: "Gladbach", elo: 1657, country: "GER" },
  { name: "Getafe", elo: 1657, country: "ESP" },
  { name: "Mallorca", elo: 1657, country: "ESP" },
  { name: "Braga", elo: 1648, country: "POR" },
  { name: "Valencia", elo: 1645, country: "ESP" },
  { name: "Alkmaar", elo: 1641, country: "NED" },
  { name: "Genk", elo: 1638, country: "BEL" },
  { name: "Зенит", elo: 1635, country: "RUS" },
  { name: "Sparta Praha", elo: 1634, country: "CZE" },
  { name: "Augsburg", elo: 1634, country: "GER" },
  { name: "Sassuolo", elo: 1629, country: "ITA" },
  { name: "Twente", elo: 1621, country: "NED" },
  { name: "Bodø/Glimt", elo: 1619, country: "NOR" },
  { name: "Alavés", elo: 1619, country: "ESP" },
  { name: "Espanyol", elo: 1618, country: "ESP" },
  { name: "Werder", elo: 1618, country: "GER" },
  { name: "Hoffenheim", elo: 1616, country: "GER" },
  { name: "Viktoria Plzeň", elo: 1614, country: "CZE" },
  { name: "Crvena Zvezda", elo: 1613, country: "SRB" },
  { name: "Anderlecht", elo: 1611, country: "BEL" },
  { name: "Sheffield United", elo: 1607, country: "ENG" },
  { name: "Como", elo: 1605, country: "ITA" },
  { name: "FC København", elo: 1602, country: "DEN" },
  { name: "Cagliari", elo: 1600, country: "ITA" },
  { name: "Verona", elo: 1600, country: "ITA" },
  { name: "Rangers", elo: 1600, country: "SCO" },
  { name: "Auxerre", elo: 1596, country: "FRA" },
  { name: "Краснодар", elo: 1595, country: "RUS" },
  { name: "Leicester", elo: 1594, country: "ENG" },
  { name: "Empoli", elo: 1592, country: "ITA" },
  { name: "Guimarães", elo: 1592, country: "POR" },
  { name: "Las Palmas", elo: 1591, country: "ESP" },
  { name: "Спартак Москва", elo: 1591, country: "RUS" },
  { name: "Leganes", elo: 1590, country: "ESP" },
  { name: "Lecce", elo: 1588, country: "ITA" },
  { name: "Ipswich", elo: 1583, country: "ENG" },
  { name: "Utrecht", elo: 1582, country: "NED" },
  { name: "Reims", elo: 1579, country: "FRA" },
  { name: "AEK", elo: 1578, country: "GRE" },
  { name: "Levante", elo: 1578, country: "ESP" },
  { name: "Union Berlin", elo: 1577, country: "GER" },
  { name: "Lorient", elo: 1575, country: "FRA" },
  { name: "Antwerp", elo: 1574, country: "BEL" },
  { name: "Gent", elo: 1571, country: "BEL" },
  { name: "Midtjylland", elo: 1571, country: "DEN" },
  { name: "Huesca", elo: 1567, country: "ESP" },
  { name: "Monza", elo: 1567, country: "ITA" },
  { name: "Шахтар", elo: 1567, country: "UKR" },
  { name: "Almería", elo: 1564, country: "ESP" },
  { name: "Parma", elo: 1563, country: "ITA" },
  { name: "Nantes", elo: 1563, country: "FRA" },
  { name: "St. Pauli", elo: 1560, country: "GER" }
];

// Constantes para calcular el multiplicador basado en el ELO
export const MAX_ELO = 2010; // Liverpool
export const MIN_ELO = 1560; // St. Pauli
export const ELO_RANGE = MAX_ELO - MIN_ELO;
export const MIN_STRENGTH_MULTIPLIER = 0.8; // 20% de reducción máxima

// Función para calcular el multiplicador de fuerza basado en ELO
export function calculateStrengthMultiplier(elo: number): number {
  // Aplicamos la fórmula: s = 1 - 0.2 * (MAX_ELO - elo) / ELO_RANGE
  return 1 - (1 - MIN_STRENGTH_MULTIPLIER) * (MAX_ELO - elo) / ELO_RANGE;
}

// Función para obtener el ELO de un equipo por su nombre
export function getTeamElo(teamName: string): number {
  const team = teamEloRatings.find(t => t.name === teamName);
  return team ? team.elo : 1800; // Valor por defecto si no se encuentra
}
