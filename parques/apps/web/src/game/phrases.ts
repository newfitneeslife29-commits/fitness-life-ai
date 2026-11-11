/** Frases colombianas para el chat rápido y las reacciones de los bots. */
export const CHAT_PHRASES = [
  '¡Uy, qué boleta!',
  '¡Lo soplé!',
  '¡Pilas pues!',
  '¡Qué jugadón!',
  '¡Nos vemos en la cárcel!',
  '¡Ave María, qué suerte!',
  '¡Eso es todo, mijo!',
  '¡Hágale pues!',
  '¡Qué nervios, parce!',
  '¡No me la monte!',
] as const;

export const REACTIONS = ['😂', '😱', '🔥', '😎', '🙏', '😡', '👏', '☕'] as const;

export const BOT_LINES = {
  capture: ['¡Nos vemos en la cárcel!', '¡Qué jugadón!', '¡Eso es todo!', '😎'],
  captured: ['¡Uy, qué boleta!', '¡No me la monte!', '😡', '😱'],
  crown: ['¡Qué jugadón!', '👑', '¡Coronamos, parce!'],
  soplo: ['¡Lo soplé!', '¡Pilas pues!', '😂'],
} as const;

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export const TIPS = [
  'Con doble 1 o doble 6 salen todas tus fichas de la cárcel.',
  'Cualquier par saca 1 o 2 fichas. Si sacas una, mueves con el otro dado.',
  'Sacar par te da otro turno… ¡pero tres pares seguidos te mandan a la cárcel!',
  'En los seguros (⭐) nadie te puede capturar.',
  'Si pudiste capturar y no lo hiciste, te pueden SOPLAR.',
  'Al cielo se entra con el número exacto.',
];
