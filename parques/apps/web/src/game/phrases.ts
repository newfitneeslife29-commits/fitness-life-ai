/** Frases del chat rápido, reacciones de los bots y tips, por idioma. */
import type { Lang } from '../stores/settingsStore';
import { useSettings } from '../stores/settingsStore';

const PHRASES: Record<Lang, string[]> = {
  es: ['¡Uy, qué boleta!', '¡Lo soplé!', '¡Pilas pues!', '¡Qué jugadón!', '¡Nos vemos en la cárcel!', '¡Ave María, qué suerte!', '¡Eso es todo, mijo!', '¡Hágale pues!', '¡Qué nervios, parce!', '¡No me la monte!'],
  en: ['Oops, how embarrassing!', 'Busted!', 'Watch out!', 'What a move!', 'See you in jail!', 'Wow, so lucky!', "That's it!", 'Go for it!', "I'm so nervous!", 'Give me a break!'],
  pt: ['Ih, que vergonha!', 'Te peguei!', 'Fica esperto!', 'Que jogada!', 'Te vejo na cadeia!', 'Nossa, que sorte!', 'É isso aí!', 'Vai fundo!', 'Que nervoso!', 'Para com isso!'],
  fr: ['Oups, la honte !', 'Je t\'ai eu !', 'Attention !', 'Quel coup !', 'À bientôt en prison !', 'Quelle chance !', 'C\'est ça !', 'Vas-y !', 'Je stresse !', 'Arrête un peu !'],
};

export function phrases(lang: Lang): string[] {
  return PHRASES[lang] ?? PHRASES.es;
}

/** Frases de las regiones de Colombia (en español en todos los idiomas: son parte del sabor del juego). */
export const REGIONS: { id: string; name: string; flag: string; phrases: string[] }[] = [
  { id: 'costa', name: 'Costa', flag: '🌴', phrases: ['¡Ajá, y entonces!', '¡Erda, qué jugada!', '¡Nojoda, me cogiste!', '¡Eche, qué vaina!', '¡Ombe, no me hagas eso!', '¡Ay hombe, tan bacano!', '¡Mi llave, te fuiste pa\' la cárcel!', '¡Qué molleja de suerte!', '¡Ponte pilas, cachaco!', '¡Eso está chévere, compa!', '¡Ajá, ¿y la mía qué?!', '¡Bacano, mi vale!', '¡Dale, vale mía!', '¡Eche, apúrate pues!', '¡Apúrate, maní!', '¡Muévete rápido, maní!', '¡Ajá, ¿y qué esperas?!', '¡Eche, no te duermas!', '¡Erda, vale, tira ya!', '¡Ombe, muévete que se enfría!', '¡Dale, que no tenemos todo el día!', '¡Ajá, mi vale, tu turno!', '¡Eche, qué lentitud!', '¡Pa\' lante, maní!'] },
  { id: 'paisa', name: 'Paisa', flag: '⛰️', phrases: ['¡Ave María, pues!', '¡Qué chimba de jugada!', '¡Hágale, mijo!', '¡Pilas, parcero!', '¡Qué pecado con usté!', '¡Eh, avemaría, qué suerte!', '¡De una, parce!', '¡Bien pueda, mijo!'] },
  { id: 'rolo', name: 'Bogotá', flag: '🏙️', phrases: ['¡Qué chévere, sumercé!', '¡Uy, qué oso!', '¡Juemadre, qué suerte!', '¡Bacano, parce!', '¡Qué boleta, hermano!', '¡Ala, qué jugadita!', '¡Me tumbó, vea pues!'] },
  { id: 'valle', name: 'Valle', flag: '💃', phrases: ['¡Oís, mirá esa jugada!', '¡Ve, qué bonito!', '¡Qué pena con vos!', '¡Ey, mirá vé!', '¡Eso es salsa, mi so!', '¡Ve, ni lo sentiste!'] },
  { id: 'santander', name: 'Santander', flag: '🐜', phrases: ['¡Qué jartera, mano!', '¡Ábrase, mano!', '¡Mano, qué jugadita!', '¡Hijuepucha, me ganó!', '¡Eso es a lo santandereano!'] },
  { id: 'pacifico', name: 'Pacífico', flag: '🌊', phrases: ['¡Ey, qué sabroso!', '¡Qué sabrosura, mi hermano!', '¡Aguanta, primo!', '¡Eso es currulao!'] },
  { id: 'llanos', name: 'Llanos', flag: '🐎', phrases: ['¡Ajo, compadre!', '¡Upa, compae!', '¡Eso es pa\' los llanos!', '¡Ahí sí, cabrestero!'] },
  { id: 'sur', name: 'Nariño y Tolima', flag: '🌋', phrases: ['¡Achichay!', '¡Ala, qué suerte!', '¡Opa, qué voleo!', '¡Ayayay, qué jugada!', '¡Eso, guambra!'] },
  { id: 'boyaca', name: 'Boyacá', flag: '🥔', phrases: ['¡Sumercé, qué jugada tan buena!', '¡Ay, juepucha!', '¡Qué hubo, sumercé!', '¡Ahí le dejo, mi señor!'] },
];

const LINES: Record<Lang, Record<'capture' | 'captured' | 'crown' | 'soplo' | 'pilas', string[]>> = {
  es: {
    capture: ['¡Nos vemos en la cárcel!', '¡Qué jugadón!', '¡Eso es todo!', '😎', '¡Mi llave, te fuiste pa\' la cárcel!', '¡Erda, qué jugada!', '¡Qué chimba de jugada!', '¡Ve, ni lo sentiste!', '¡Ajo, compadre!'],
    captured: ['¡Uy, qué boleta!', '¡No me la monte!', '😡', '😱', '¡Nojoda, me cogiste!', '¡Ave María, pues!', '¡Qué jartera, mano!', '¡Ay, juepucha!', '¡Achichay!'],
    crown: ['¡Qué jugadón!', '👑', '¡Coronamos, parce!', '¡Ay hombe, tan bacano!', '¡Qué sabrosura!', '¡Eso es salsa, mi so!'],
    soplo: ['¡Lo soplé!', '¡Pilas pues!', '😂', '¡Ajá, y entonces!', '¡Ponte pilas, cachaco!'],
    pilas: ['¡Pilas pues!', '¡Uy, se viene!', '¡Pilas, parcero!', '¡Aguanta, primo!'],
  },
  en: { capture: ['See you in jail!', 'What a move!', '😎'], captured: ['Oops!', 'Give me a break!', '😡', '😱'], crown: ['What a move!', '👑', 'Crowned!'], soplo: ['Busted!', '😂'], pilas: ['Watch out!', 'Here it comes!'] },
  pt: { capture: ['Te vejo na cadeia!', 'Que jogada!', '😎'], captured: ['Ih!', 'Para com isso!', '😡', '😱'], crown: ['Que jogada!', '👑', 'Coroei!'], soplo: ['Te peguei!', '😂'], pilas: ['Fica esperto!', 'Lá vem!'] },
  fr: { capture: ['À bientôt en prison !', 'Quel coup !', '😎'], captured: ['Oups !', 'Arrête un peu !', '😡', '😱'], crown: ['Quel coup !', '👑', 'Couronné !'], soplo: ['Je t\'ai eu !', '😂'], pilas: ['Attention !', 'Ça arrive !'] },
};

/** Frases de los bots en el idioma actual. */
export const BOT_LINES = new Proxy({} as Record<'capture' | 'captured' | 'crown' | 'soplo' | 'pilas', string[]>, {
  get: (_t, k: string) => (LINES[useSettings.getState().language] ?? LINES.es)[k as 'capture'],
});

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** Tips (claves en español; se traducen con t()). */
export const TIPS = [
  'Con doble 1 o doble 6 salen todas tus fichas de la cárcel.',
  'Cualquier par saca 1 o 2 fichas. Si sacas una, mueves con el otro dado.',
  'Sacar par te da otro turno… ¡pero tres pares seguidos te mandan a la cárcel!',
  'En los seguros nadie te puede capturar.',
  'Si pudiste capturar y no lo hiciste, te pueden SOPLAR.',
  'Al cielo se entra con el número exacto.',
  'El 1º de cada mesa se lleva el 75 % de lo que pierden los rivales y 5 gemas.',
  'Usa las gemas para enviar emotes durante la partida.',
];

/** ¿El texto es solo emojis? (se muestra grande, como emote). */
export function isEmote(text: string): boolean {
  return !/[\p{L}\p{N}]/u.test(text) && text.trim().length <= 8;
}
