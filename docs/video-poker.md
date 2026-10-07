# Documento de diseño: Juego de Video Poker

> Versión 1.0 · Variante base: **Jacks or Better (9/6)** · Stack sugerido: React 19 + TypeScript + Vite (el mismo de este repositorio)

---

## 1. Resumen

El objetivo es construir un juego de **Video Poker** para un solo jugador, inspirado en las máquinas clásicas de casino. El jugador recibe 5 cartas, elige cuáles conservar ("hold"), cambia el resto una sola vez y cobra según la mano final y la tabla de pagos.

El juego usa **créditos virtuales sin valor monetario** (modo entretenimiento). No se contempla dinero real; eso implicaría licencias de juego, verificación de edad, auditoría del RNG, etc., fuera del alcance de este documento.

### Objetivos

- Jugabilidad fiel a la máquina clásica (Jacks or Better 9/6, RTP ≈ 99,54 % con estrategia óptima).
- Lógica de juego pura, testeable y separada de la interfaz.
- Interfaz responsiva (móvil y escritorio) con controles por teclado.
- Persistencia local de créditos y estadísticas.

### Fuera de alcance (v1)

- Dinero real, pagos o apuestas entre usuarios.
- Multijugador.
- Variantes adicionales (se dejan para el roadmap, sección 11).

---

## 2. Reglas del juego (Jacks or Better)

1. **Apuesta**: el jugador elige de 1 a 5 créditos por mano ("Bet One" / "Bet Max").
2. **Reparto (Deal)**: se baraja una baraja estándar de 52 cartas (sin comodines) y se reparten 5 cartas boca arriba. Se descuenta la apuesta.
3. **Retener (Hold)**: el jugador marca las cartas que quiere conservar (0 a 5).
4. **Cambio (Draw)**: las cartas no retenidas se reemplazan por las siguientes de **la misma baraja** (sin volver a barajar).
5. **Pago**: se evalúa la mano final y se paga según la tabla. La mano mínima que paga es **un par de Jotas o superior** (J, Q, K, A).
6. Vuelta al paso 1.

### 2.1 Tabla de pagos (9/6)

| Mano | 1 crédito | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| Escalera Real (Royal Flush) | 250 | 500 | 750 | 1000 | **4000** |
| Escalera de Color (Straight Flush) | 50 | 100 | 150 | 200 | 250 |
| Póker (Four of a Kind) | 25 | 50 | 75 | 100 | 125 |
| Full House | **9** | 18 | 27 | 36 | 45 |
| Color (Flush) | **6** | 12 | 18 | 24 | 30 |
| Escalera (Straight) | 4 | 8 | 12 | 16 | 20 |
| Trío (Three of a Kind) | 3 | 6 | 9 | 12 | 15 |
| Doble Par (Two Pair) | 2 | 4 | 6 | 8 | 10 |
| Par de J o mejor (Jacks or Better) | 1 | 2 | 3 | 4 | 5 |

> El "9/6" se refiere al pago del Full House (9) y del Color (6). El bono de la Escalera Real con 5 créditos (4000 en lugar de 1250) incentiva apostar el máximo.

### 2.2 Probabilidades aproximadas (estrategia óptima)

| Mano | Frecuencia aprox. |
|---|---|
| Escalera Real | 1 en 40 000 |
| Escalera de Color | 1 en 9 150 |
| Póker | 1 en 423 |
| Full House | 1 en 87 |
| Color | 1 en 91 |
| Escalera | 1 en 89 |
| Trío | 1 en 13 |
| Doble Par | 1 en 7,7 |
| Par de J o mejor | 1 en 4,6 |
| Sin premio | ≈ 55 % de las manos |

### 2.3 Casos especiales

- **Escalera baja (A-2-3-4-5)**: el As cuenta como 1. Es una escalera válida.
- **No hay vuelta**: Q-K-A-2-3 **no** es escalera.
- Un par de 10 o menor **no paga**.

---

## 3. Flujo y máquina de estados

```
          ┌───────────────────────────────────────────┐
          ▼                                           │
   ┌─────────────┐  Deal (créditos ≥ apuesta)  ┌──────┴──────┐
   │   BETTING   │ ──────────────────────────▶ │    DEALT    │
   │ (elige 1–5) │                             │ (hold/unhold)│
   └─────────────┘                             └──────┬──────┘
          ▲                                           │ Draw
          │            ┌─────────────┐                │
          └─────────── │   RESULT    │ ◀──────────────┘
         Nueva mano    │ (pago/premio)│
                       └─────────────┘
```

| Estado | Acciones permitidas | Botón principal |
|---|---|---|
| `BETTING` | Bet One, Bet Max, Deal | **DEAL** |
| `DEALT` | Alternar Hold en cada carta, Draw | **DRAW** |
| `RESULT` | Ver premio, Bet One/Max, Deal (nueva mano) | **DEAL** |

Reglas:
- Si los créditos son menores que la apuesta, se ajusta la apuesta al máximo posible; si son 0, se ofrece "Recargar créditos".
- "Bet Max" en estado `BETTING` fija la apuesta en 5 y reparte automáticamente (comportamiento clásico).

---

## 4. Modelo de datos (TypeScript)

```ts
// src/games/videopoker/types.ts
export type Suit = 'S' | 'H' | 'D' | 'C';          // picas, corazones, diamantes, tréboles
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J … 14=A

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandRank =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'JACKS_OR_BETTER'
  | 'NOTHING';

export type Phase = 'BETTING' | 'DEALT' | 'RESULT';

export interface GameState {
  phase: Phase;
  credits: number;
  bet: number;               // 1..5
  deck: Card[];              // cartas restantes
  hand: Card[];              // siempre 5 cartas tras el reparto
  held: boolean[];           // 5 posiciones
  result: HandRank | null;
  lastWin: number;
}
```

### 4.1 Tabla de pagos como datos

```ts
// src/games/videopoker/paytable.ts
export const PAYTABLE: Record<HandRank, number> = {
  ROYAL_FLUSH: 250,
  STRAIGHT_FLUSH: 50,
  FOUR_OF_A_KIND: 25,
  FULL_HOUSE: 9,
  FLUSH: 6,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  JACKS_OR_BETTER: 1,
  NOTHING: 0,
};

export function payout(rank: HandRank, bet: number): number {
  if (rank === 'ROYAL_FLUSH' && bet === 5) return 4000;
  return PAYTABLE[rank] * bet;
}
```

Tener la tabla como datos permite añadir variantes (Bonus Poker, Double Double Bonus…) sin tocar la lógica.

---

## 5. Lógica principal

### 5.1 Baraja y barajado (Fisher–Yates + RNG criptográfico)

`Math.random()` no es adecuado para juegos de cartas: usar `crypto.getRandomValues` con **muestreo por rechazo** para evitar el sesgo del módulo.

```ts
// src/games/videopoker/deck.ts
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

/** Entero uniforme en [0, max) sin sesgo de módulo. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

### 5.2 Evaluador de manos

```ts
// src/games/videopoker/evaluate.ts
export function evaluateHand(hand: Card[]): HandRank {
  const ranks = hand.map((c) => c.rank).sort((a, b) => a - b);
  const isFlush = hand.every((c) => c.suit === hand[0].suit);

  // Conteo por valor, ordenado de mayor a menor frecuencia: p. ej. [3, 2] = full
  const countMap = new Map<number, number>();
  for (const r of ranks) countMap.set(r, (countMap.get(r) ?? 0) + 1);
  const counts = [...countMap.values()].sort((a, b) => b - a);

  const unique = countMap.size === 5;
  const isWheel = ranks.join(',') === '2,3,4,5,14';        // A-2-3-4-5
  const isStraight = unique && (ranks[4] - ranks[0] === 4 || isWheel);

  if (isStraight && isFlush) return ranks[0] === 10 ? 'ROYAL_FLUSH' : 'STRAIGHT_FLUSH';
  if (counts[0] === 4) return 'FOUR_OF_A_KIND';
  if (counts[0] === 3 && counts[1] === 2) return 'FULL_HOUSE';
  if (isFlush) return 'FLUSH';
  if (isStraight) return 'STRAIGHT';
  if (counts[0] === 3) return 'THREE_OF_A_KIND';
  if (counts[0] === 2 && counts[1] === 2) return 'TWO_PAIR';
  if (counts[0] === 2) {
    const pairRank = [...countMap].find(([, n]) => n === 2)![0];
    if (pairRank >= 11) return 'JACKS_OR_BETTER';
  }
  return 'NOTHING';
}
```

### 5.3 Reducer del juego

Un `useReducer` mantiene la lógica pura y fácil de probar.

```ts
// src/games/videopoker/reducer.ts
export type Action =
  | { type: 'BET_ONE' }
  | { type: 'BET_MAX' }
  | { type: 'DEAL' }
  | { type: 'TOGGLE_HOLD'; index: number }
  | { type: 'DRAW' }
  | { type: 'ADD_CREDITS'; amount: number };

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'BET_ONE':
      if (state.phase === 'DEALT') return state;
      return { ...state, bet: (state.bet % 5) + 1 };

    case 'BET_MAX':
      if (state.phase === 'DEALT') return state;
      return reducer({ ...state, bet: 5 }, { type: 'DEAL' });

    case 'DEAL': {
      if (state.phase === 'DEALT' || state.credits < state.bet) return state;
      const deck = shuffle(createDeck());
      return {
        ...state,
        phase: 'DEALT',
        credits: state.credits - state.bet,
        hand: deck.slice(0, 5),
        deck: deck.slice(5),
        held: [false, false, false, false, false],
        result: null,
        lastWin: 0,
      };
    }

    case 'TOGGLE_HOLD': {
      if (state.phase !== 'DEALT') return state;
      const held = [...state.held];
      held[action.index] = !held[action.index];
      return { ...state, held };
    }

    case 'DRAW': {
      if (state.phase !== 'DEALT') return state;
      const deck = [...state.deck];
      const hand = state.hand.map((card, i) => (state.held[i] ? card : deck.shift()!));
      const result = evaluateHand(hand);
      const win = payout(result, state.bet);
      return { ...state, phase: 'RESULT', hand, deck, result, lastWin: win, credits: state.credits + win };
    }

    case 'ADD_CREDITS':
      return { ...state, credits: state.credits + action.amount };
  }
}
```

---

## 6. Interfaz de usuario

### 6.1 Disposición

```
┌──────────────────────────────────────────────────────┐
│                 TABLA DE PAGOS                       │
│  (columna resaltada = apuesta actual;                │
│   fila parpadeante = mano ganadora)                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│   [ A♠ ]   [ K♠ ]   [ Q♠ ]   [ J♠ ]   [ 10♠ ]        │
│    HELD              HELD                            │
│                                                      │
├──────────────────────────────────────────────────────┤
│  GANANCIA: 4000        APUESTA: 5     CRÉDITOS: 4995 │
├──────────────────────────────────────────────────────┤
│ [BET ONE] [BET MAX]                     [DEAL/DRAW]  │
└──────────────────────────────────────────────────────┘
```

### 6.2 Componentes React

| Componente | Responsabilidad |
|---|---|
| `VideoPoker` | Contenedor; `useReducer`, persistencia, atajos de teclado |
| `PayTable` | Muestra la tabla; resalta columna de apuesta y fila ganadora |
| `CardView` | Dibuja una carta (frente/dorso), etiqueta "HELD", animación de volteo |
| `Hand` | Fila de 5 `CardView`; clic = `TOGGLE_HOLD` |
| `CreditBar` | Ganancia, apuesta y créditos |
| `Controls` | Botones Bet One, Bet Max, Deal/Draw (habilitados según `phase`) |

Ubicación sugerida: `components/videopoker/` para la UI y `src/games/videopoker/` para la lógica pura.

### 6.3 Controles de teclado

| Tecla | Acción |
|---|---|
| `1`–`5` | Alternar Hold de la carta 1–5 |
| `Espacio` / `Enter` | Deal / Draw |
| `B` | Bet One |
| `M` | Bet Max |

### 6.4 Detalles visuales y sonido

- Animación de volteo (CSS `transform: rotateY`) escalonada 80 ms por carta.
- Efecto de confeti al obtener Póker o superior (`canvas-confetti` ya está en las dependencias).
- Sonidos cortos: reparto, hold, premio. Botón de silencio.
- Palos rojos (♥ ♦) y negros (♠ ♣); opción de "baraja de 4 colores" para accesibilidad.

### 6.5 Accesibilidad

- Cada carta es un `<button>` con `aria-pressed` para el estado Hold y `aria-label` (p. ej. "As de picas, retenida").
- Anunciar el resultado con una región `aria-live="polite"`.
- Contraste mínimo AA y foco visible.

---

## 7. Persistencia y estadísticas

Guardar en `localStorage` (envuelto en `try/catch`):

```ts
interface SavedData {
  credits: number;
  bet: number;
  stats: {
    handsPlayed: number;
    totalBet: number;
    totalWon: number;
    byRank: Record<HandRank, number>;
    biggestWin: number;
  };
}
```

- Créditos iniciales: **1000**. Si llegan a 0, botón "Recargar 1000".
- Pantalla de estadísticas: manos jugadas, RTP real (`totalWon / totalBet`), conteo por tipo de mano.
- Opcional: sincronizar con Supabase (ya presente en el proyecto) para una tabla de clasificación.

---

## 8. Ayuda de estrategia (opcional)

Modo "Consejo" que resalta las cartas recomendadas. Versión simplificada de la estrategia óptima para 9/6 (en orden de prioridad, quedarse con la primera opción que aplique):

1. Escalera Real, Escalera de Color, Póker hechos.
2. 4 cartas a Escalera Real.
3. Full House, Color, Trío, Escalera hechos.
4. 4 cartas a Escalera de Color.
5. Doble Par.
6. Par alto (J, Q, K, A).
7. 3 cartas a Escalera Real.
8. 4 cartas a Color.
9. Par bajo (2–10).
10. 4 cartas a escalera abierta.
11. 2 cartas altas del mismo palo.
12. 3 cartas a Escalera de Color.
13. 2 cartas altas de distinto palo (si hay más, quedarse con las 2 más bajas).
14. Una carta alta.
15. Nada: cambiar las 5.

Una versión avanzada puede calcular el **valor esperado exacto** de las 32 combinaciones de hold enumerando todos los cambios posibles (≈ 2,6 M evaluaciones en el peor caso; conviene usar un Web Worker).

---

## 9. Pruebas

### 9.1 Unitarias (Vitest)

- `evaluateHand`: al menos un caso por tipo de mano, más casos límite:
  - A-2-3-4-5 → `STRAIGHT`; A-2-3-4-5 del mismo palo → `STRAIGHT_FLUSH`.
  - 10-J-Q-K-A del mismo palo → `ROYAL_FLUSH`.
  - Q-K-A-2-3 → `NOTHING`.
  - Par de 10 → `NOTHING`; par de J → `JACKS_OR_BETTER`.
- `payout`: Escalera Real con 5 créditos = 4000; con 4 = 1000.
- `reducer`: no se puede hacer Draw en `BETTING`; Deal descuenta la apuesta; las cartas retenidas no cambian tras Draw; Deal bloqueado sin créditos.
- `shuffle`: la baraja tiene 52 cartas únicas tras barajar.

### 9.2 Estadísticas / simulación

- Prueba de uniformidad del barajado (chi-cuadrado sobre la posición de cada carta en ~100 000 barajados).
- Simulación de 1 M de manos con la estrategia simplificada: el RTP debe quedar cerca de **99 %**.

### 9.3 E2E (Playwright)

- Flujo completo: Bet Max → Hold de 2 cartas → Draw → créditos actualizados.
- Atajos de teclado.

---

## 10. Plan de implementación

| Fase | Entregable | Estimación |
|---|---|---|
| 1 | Tipos, baraja, barajado, evaluador + tests | 1 día |
| 2 | Reducer, tabla de pagos + tests | 0,5 días |
| 3 | UI básica (cartas, botones, tabla de pagos) | 1–2 días |
| 4 | Animaciones, sonidos, teclado, accesibilidad | 1 día |
| 5 | Persistencia y estadísticas | 0,5 días |
| 6 | Consejo de estrategia | 1 día |
| 7 | Pulido, pruebas E2E y simulación de RTP | 1 día |

Integración en esta app: añadir una ruta (p. ej. `/games/video-poker`) en `react-router-dom` y un acceso desde el `Sidebar`.

---

## 11. Roadmap (variantes futuras)

| Variante | Diferencia principal |
|---|---|
| **Bonus Poker** | Pagos extra por Póker de Ases o de 2–4 |
| **Double Double Bonus** | Bonos por Póker de Ases con "kicker" 2–4 |
| **Deuces Wild** | Los 2 son comodines; mano mínima: trío |
| **Joker Poker** | 53 cartas con un comodín; mano mínima: par de K |
| **Multi-hand** | 3, 10 o 100 manos simultáneas con el mismo hold |
| **Double Up** | Minijuego opcional para doblar el premio |

Para soportarlas, el evaluador debería recibir la configuración de la variante (comodines, mano mínima) y la tabla de pagos como parámetros.

---

## 12. Juego responsable

Aunque los créditos sean virtuales, se recomienda:

- Indicar claramente que **no hay dinero real** involucrado.
- Mostrar el tiempo de sesión y el RTP real en las estadísticas.
- No incluir compras de créditos con dinero real sin evaluar antes las implicaciones legales y regulatorias de cada país.
