/** Temporadas con skins temáticas. Fechas por mes/día (se repiten cada año). */
export interface Season {
  id: 'carnaval' | 'feria' | 'navidad';
  name: string;
  emoji: string;
  /** [mes, día] de inicio y fin (inclusive). */
  from: [number, number];
  to: [number, number];
  colors: [string, string];
  blurb: string;
}

export const SEASONS: Season[] = [
  { id: 'carnaval', name: 'Carnaval de Barranquilla', emoji: '🎭', from: [1, 15], to: [3, 15], colors: ['#ff3b8a', '#ffc928'], blurb: '¡Quien lo vive es quien lo goza! Tablero, dados y marco de carnaval.' },
  { id: 'feria', name: 'Feria de las Flores', emoji: '🌸', from: [7, 15], to: [9, 15], colors: ['#ff6fb5', '#22c55e'], blurb: 'Silletas, flores y orgullo paisa en tu mesa.' },
  { id: 'navidad', name: 'Navidad colombiana', emoji: '🎄', from: [11, 1], to: [1, 10], colors: ['#e11d48', '#16a34a'], blurb: 'Natilla, buñuelos y alumbrados: skins navideñas por tiempo limitado.' },
];

function md(d: Date): number {
  return (d.getMonth() + 1) * 100 + d.getDate();
}

export function isActive(s: Season, date: Date): boolean {
  const x = md(date);
  const a = s.from[0] * 100 + s.from[1];
  const b = s.to[0] * 100 + s.to[1];
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}

export function activeSeason(date = new Date()): Season | null {
  return SEASONS.find((s) => isActive(s, date)) ?? null;
}

/** Fin de la temporada activa (timestamp) para la cuenta regresiva. */
export function seasonEnd(s: Season, date = new Date()): number {
  let year = date.getFullYear();
  if (s.from[0] * 100 + s.from[1] > s.to[0] * 100 + s.to[1] && md(date) >= s.from[0] * 100 + s.from[1]) year++;
  return new Date(year, s.to[0] - 1, s.to[1], 23, 59, 59).getTime();
}

/** Próxima temporada (para anunciarla cuando no hay ninguna activa). */
export function nextSeason(date = new Date()): { season: Season; startsAt: number } {
  const options = SEASONS.map((s) => {
    let t = new Date(date.getFullYear(), s.from[0] - 1, s.from[1]).getTime();
    if (t <= date.getTime()) t = new Date(date.getFullYear() + 1, s.from[0] - 1, s.from[1]).getTime();
    return { season: s, startsAt: t };
  });
  return options.sort((a, b) => a.startsAt - b.startsAt)[0]!;
}
