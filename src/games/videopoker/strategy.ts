import { evaluateHand } from './evaluate';
import { Card } from './types';

/**
 * Estrategia simplificada para Jacks or Better 9/6 (sección 8 del documento).
 * Devuelve qué cartas retener, siguiendo la primera regla que aplique.
 */
export function recommendHolds(hand: Card[]): boolean[] {
  return toMask(recommendIndices(hand));
}

const isHigh = (c: Card) => c.rank >= 11;

function toMask(indices: number[]): boolean[] {
  return [0, 1, 2, 3, 4].map((i) => indices.includes(i));
}

function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, acc: number[]) => {
    if (acc.length === k) return void out.push(acc);
    for (let i = start; i < n; i++) rec(i + 1, [...acc, i]);
  };
  rec(0, []);
  return out;
}

function sameSuit(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

/** Las cartas caben en una misma escalera (sin repetidos, rango ≤ 5, As alto o bajo). */
function fitsStraight(cards: Card[]): boolean {
  const fits = (ranks: number[]) =>
    new Set(ranks).size === ranks.length && Math.max(...ranks) - Math.min(...ranks) <= 4;
  const ranks = cards.map((c) => c.rank as number);
  return fits(ranks) || fits(ranks.map((r) => (r === 14 ? 1 : r)));
}

function find(hand: Card[], k: number, pred: (cards: Card[]) => boolean): number[] | null {
  for (const idx of combinations(hand.length, k)) {
    if (pred(idx.map((i) => hand[i]))) return idx;
  }
  return null;
}

function indicesOfRankCount(hand: Card[], count: number): number[] {
  const counts = new Map<number, number>();
  for (const c of hand) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  return hand.flatMap((c, i) => (counts.get(c.rank) === count ? [i] : []));
}

export function recommendIndices(hand: Card[]): number[] {
  const all = [0, 1, 2, 3, 4];
  const made = evaluateHand(hand);

  // 1. Escalera Real, Escalera de Color, Póker hechos
  if (made === 'ROYAL_FLUSH' || made === 'STRAIGHT_FLUSH') return all;
  if (made === 'FOUR_OF_A_KIND') return indicesOfRankCount(hand, 4);

  // 2. 4 cartas a Escalera Real
  const fourToRoyal = find(hand, 4, (cs) => sameSuit(cs) && cs.every((c) => c.rank >= 10));
  if (fourToRoyal) return fourToRoyal;

  // 3. Full House, Color, Trío, Escalera hechos
  if (made === 'FULL_HOUSE' || made === 'FLUSH' || made === 'STRAIGHT') return all;
  if (made === 'THREE_OF_A_KIND') return indicesOfRankCount(hand, 3);

  // 4. 4 cartas a Escalera de Color
  const fourToSF = find(hand, 4, (cs) => sameSuit(cs) && fitsStraight(cs));
  if (fourToSF) return fourToSF;

  // 5. Doble Par
  if (made === 'TWO_PAIR') return indicesOfRankCount(hand, 2);

  // 6. Par alto
  if (made === 'JACKS_OR_BETTER') return indicesOfRankCount(hand, 2);

  // 7. 3 cartas a Escalera Real
  const threeToRoyal = find(hand, 3, (cs) => sameSuit(cs) && cs.every((c) => c.rank >= 10));
  if (threeToRoyal) return threeToRoyal;

  // 8. 4 cartas a Color
  const fourToFlush = find(hand, 4, sameSuit);
  if (fourToFlush) return fourToFlush;

  // 9. Par bajo
  const pair = indicesOfRankCount(hand, 2);
  if (pair.length === 2) return pair;

  // 10. 4 cartas a escalera abierta (4 consecutivas, sin As)
  const openStraight = find(hand, 4, (cs) => {
    const r = cs.map((c) => c.rank as number).sort((a, b) => a - b);
    return new Set(r).size === 4 && r[3] - r[0] === 3 && r[3] <= 13;
  });
  if (openStraight) return openStraight;

  // 11. 2 cartas altas del mismo palo
  const suitedHigh = find(hand, 2, (cs) => sameSuit(cs) && cs.every(isHigh));
  if (suitedHigh) return suitedHigh;

  // 12. 3 cartas a Escalera de Color
  const threeToSF = find(hand, 3, (cs) => sameSuit(cs) && fitsStraight(cs));
  if (threeToSF) return threeToSF;

  // 13. 2 cartas altas de distinto palo (si hay más, las 2 más bajas)
  const high = all.filter((i) => isHigh(hand[i])).sort((a, b) => hand[a].rank - hand[b].rank);
  if (high.length >= 2) return high.slice(0, 2).sort((a, b) => a - b);

  // 14. Una carta alta
  if (high.length === 1) return high;

  // 15. Cambiar las 5
  return [];
}
