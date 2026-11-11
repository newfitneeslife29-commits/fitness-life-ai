/** Textos de la interfaz en español (base) e inglés. Las frases del chat quedan en "colombiano". */
import { useSettings, type Lang } from '../stores/settingsStore';

const EN: Record<string, string> = {
  'JUGAR': 'PLAY',
  'contra la máquina': 'vs the computer',
  'Local': 'Local',
  'en el mismo celular': 'same phone',
  'Parejas': 'Teams',
  'Rápido': 'Quick',
  '2 fichas · 5 min': '2 pieces · 5 min',
  'Online': 'Online',
  'Partida rápida': 'Quick match',
  'Mesa privada': 'Private table',
  'Torneo': 'Tournament',
  'Tienda': 'Shop',
  'Eventos': 'Events',
  'Ranking': 'Ranking',
  'Perfil': 'Profile',
  'Amigos': 'Friends',
  'Ajustes': 'Settings',
  'Inicio': 'Home',
  'Recompensa diaria': 'Daily reward',
  'Sonido': 'Sound',
  'Música': 'Music',
  'Vibración': 'Vibration',
  'Idioma': 'Language',
  'Tema': 'Theme',
  'Oscuro': 'Dark',
  'Claro': 'Light',
  'Reglas de la casa': 'House rules',
  'Cuenta': 'Account',
  'Soplar': 'Blow (soplar)',
  'Tres pares a la cárcel': 'Three doubles = jail',
  'Intentos para salir': 'Tries to leave jail',
  'Tiempo por turno': 'Time per turn',
  'Misiones diarias': 'Daily missions',
  'Misiones semanales': 'Weekly missions',
  'Reclamar': 'Claim',
  'Elige tu mesa': 'Choose your table',
  'Entrada': 'Entry',
  'Premio': 'Prize',
  'Práctica libre': 'Free practice',
  'Estadísticas': 'Stats',
  'Logros': 'Achievements',
  'Partidas': 'Games',
  'Victorias': 'Wins',
  'Capturas': 'Captures',
  '% de victoria': 'Win %',
  'Temporada': 'Season',
  'Nivel': 'Level',
  'Comprar': 'Buy',
  'Usar': 'Equip',
  'En uso': 'Equipped',
  'Revancha': 'Rematch',
  'Menú': 'Menu',
};

export function translate(lang: Lang, text: string): string {
  return lang === 'en' ? (EN[text] ?? text) : text;
}

export function useT() {
  const lang = useSettings((s) => s.language);
  return (text: string) => translate(lang, text);
}
