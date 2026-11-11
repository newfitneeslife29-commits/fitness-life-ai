/**
 * Generador pseudoaleatorio con semilla (mulberry32). Determinista:
 * la misma semilla produce la misma secuencia de dados (pruebas, repeticiones).
 * En online el servidor guarda la semilla y nunca la envía a los clientes.
 */
export function nextRandom(state: number): [value: number, next: number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

export function rollDie(state: number): [die: number, next: number] {
  const [v, next] = nextRandom(state);
  return [1 + Math.floor(v * 6), next];
}

export function rollDice(state: number): [dice: [number, number], next: number] {
  const [a, s1] = rollDie(state);
  const [b, s2] = rollDie(s1);
  return [[a, b], s2];
}

export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
