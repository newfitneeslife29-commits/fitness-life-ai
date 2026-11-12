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

const LINES: Record<Lang, Record<'capture' | 'captured' | 'crown' | 'soplo' | 'pilas', string[]>> = {
  es: { capture: ['¡Nos vemos en la cárcel!', '¡Qué jugadón!', '¡Eso es todo!', '😎'], captured: ['¡Uy, qué boleta!', '¡No me la monte!', '😡', '😱'], crown: ['¡Qué jugadón!', '👑', '¡Coronamos, parce!'], soplo: ['¡Lo soplé!', '¡Pilas pues!', '😂'], pilas: ['¡Pilas pues!', '¡Uy, se viene!'] },
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
