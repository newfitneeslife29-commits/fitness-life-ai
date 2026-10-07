import { describe, expect, it } from 'vitest';
import { recommendIndices } from '../strategy';
import { h } from './helpers';

describe('recommendIndices', () => {
  it.each([
    ['AS KS QS JS TS', [0, 1, 2, 3, 4]], // escalera real hecha
    ['7S 7H 7D 7C 2S', [0, 1, 2, 3]], // póker
    ['AH KH QH JH 3H', [0, 1, 2, 3]], // 4 a real gana a color hecho
    ['3S 3H 3D KC KS', [0, 1, 2, 3, 4]], // full
    ['8S 8H 8D 2C 5S', [0, 1, 2]], // trío
    ['5H 6H 7H 8H KC', [0, 1, 2, 3]], // 4 a escalera de color
    ['4S 4H 9D 9C AS', [0, 1, 2, 3]], // doble par
    ['JS JH 3D 6C 9S', [0, 1]], // par alto
    ['KD QD JD 4S 4C', [0, 1, 2]], // 3 a real gana a par bajo
    ['2C 6C 9C KC 5H', [0, 1, 2, 3]], // 4 a color
    ['4S 4H 9D JC 2S', [0, 1]], // par bajo
    ['5S 6H 7D 8C KS', [0, 1, 2, 3]], // escalera abierta
    ['QH KH 2S 7D 4C', [0, 1]], // 2 altas del mismo palo
    ['5S 6S 8S 2D KH', [0, 1, 2]], // 3 a escalera de color
    ['AS KH QD 2C 7S', [1, 2]], // 2 altas distintas: las 2 más bajas
    ['2S 5H 9D JC 3S', [3]], // una alta
    ['2S 5H 9D 7C 3D', []], // nada
  ])('%s → %j', (hand, expected) => {
    expect(recommendIndices(h(hand))).toEqual(expected);
  });
});
