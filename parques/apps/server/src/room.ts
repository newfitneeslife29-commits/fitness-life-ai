/**
 * Una mesa online. El servidor es la autoridad:
 *  - tira los dados con su propia semilla (los clientes nunca la ven),
 *  - valida que cada jugada venga del jugador en turno,
 *  - mueve a los bots, maneja el temporizador de turno y la ventana de soplo,
 *  - si alguien se desconecta tiene un tiempo de gracia para volver; si no vuelve
 *    (o abandona) la IA juega por él.
 * No depende de Socket.IO: recibe "conexiones" con un `emit`, lo que permite probarla.
 */
import { randomBytes, randomInt } from 'node:crypto';
import {
  applyAction,
  autoAction,
  canSoplar,
  createGame,
  sanitizeState,
  shouldSoplar,
} from '@parques/engine';
import { table as tableOf } from '@parques/engine';
import type { Action, AiLevel, GameEvent, GameState, Hello, HouseRules, NetSeat, RoomInfo, ServerToClient, TableId } from '@parques/engine';

export interface Conn {
  emit: <K extends keyof ServerToClient>(event: K, ...args: Parameters<ServerToClient[K]>) => void;
}

export interface Timing {
  turnMs: number;
  soploMs: number;
  botDelayMs: number;
  graceMs: number;
}

export const DEFAULT_TIMING: Timing = { turnMs: 20000, soploMs: 4500, botDelayMs: 900, graceMs: 30000 };

interface Seat extends NetSeat {
  level: AiLevel;
  /** Se fue de una partida online: queda fuera (sus turnos se saltan) y no puede volver. */
  left?: boolean;
}

const BOT_NAMES = ['La Toña', 'Don Chucho', 'El Mono', 'Doña Rosa', 'Pacho', 'La Nena', 'Juancho', 'Mafe'];
const BOT_AVATARS = ['🐆', '🦥', '🐢', '🐻', '🦊', '🐒', '🌺', '🎺'];

function sidesFor(n: number): number[] {
  return n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : n === 6 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3];
}

/** Resultado de un humano al terminar (para aplicar premios en su cuenta). */
export interface HumanResult {
  playerId: string;
  place: number;
  won: boolean;
  stats: { captures: number; captured: number; crowned: number; soplosHechos: number; pairs: number; tripleParCastigos: number };
}

export interface RoomOptions {
  kind: 'quick' | 'private';
  code?: string | null;
  hostId?: string | null;
  seats: number;
  rules?: Partial<HouseRules>;
  timing?: Partial<Timing>;
  table?: TableId | null;
  /** Partida contra la máquina (1 humano + bots), Modo Rápido, etc. */
  mode?: 'online' | 'ai' | 'quick' | 'teams';
  sides?: 4 | 6;
  /** Nivel de los bots (por defecto el de la mesa). */
  botLevel?: AiLevel;
  /** Límite de la partida en ms (Modo Rápido). */
  timeLimitMs?: number;
  /** Cobra la entrada de un jugador al empezar; devuelve false si no le alcanza. */
  charge?: (playerId: string, entry: number) => boolean | Promise<boolean>;
  onEnd?: (room: Room, results: HumanResult[]) => void;
  /** Copa (torneo con inscripción) a la que cuenta la partida. */
  cup?: string | null;
}

export class Room {
  readonly id = randomBytes(6).toString('hex');
  readonly kind: 'quick' | 'private';
  readonly code: string | null;
  readonly hostId: string | null;
  readonly rules: Partial<HouseRules>;
  readonly seats: Seat[];
  readonly table: TableId | null;
  readonly entry: number;
  readonly mode: 'online' | 'ai' | 'quick' | 'teams';
  readonly sides: 4 | 6;
  readonly cup: string | null;
  private botLevel: AiLevel | null;
  private timeLimitMs: number;
  private charge?: RoomOptions['charge'];
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  status: 'waiting' | 'starting' | 'playing' | 'over' = 'waiting';
  state: GameState | null = null;
  lastActivity = Date.now();

  private conns = new Map<string, Conn>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private grace = new Map<string, ReturnType<typeof setTimeout>>();
  private timing: Timing;
  private turnEndsAt: number | null = null;
  private soploEndsAt: number | null = null;
  private soploKey: string | null = null;
  private onEnd?: RoomOptions['onEnd'];

  constructor(opts: RoomOptions) {
    this.kind = opts.kind;
    this.code = opts.code ?? null;
    this.hostId = opts.hostId ?? null;
    const teams = !!opts.rules?.teams;
    this.rules = { ...opts.rules, teams, piecesPerPlayer: opts.rules?.piecesPerPlayer ?? 4 };
    this.timing = { ...DEFAULT_TIMING, ...opts.timing };
    this.onEnd = opts.onEnd;
    this.table = opts.table === undefined ? 'barrio' : opts.table;
    this.entry = this.table ? (tableOf(this.table)?.entry ?? 0) : 0;
    this.mode = opts.mode ?? 'online';
    this.sides = opts.sides === 6 ? 6 : 4;
    this.cup = opts.cup ?? null;
    this.botLevel = opts.botLevel ?? (this.table ? (tableOf(this.table)?.ai ?? null) : null);
    this.timeLimitMs = opts.timeLimitMs ?? 0;
    this.charge = opts.charge;
    this.seats = sidesFor(teams ? 4 : this.sides === 6 ? 6 : Math.min(4, opts.seats)).map((side) => ({
      side,
      name: '',
      avatar: '',
      kind: 'bot',
      playerId: null,
      connected: false,
      replaced: false,
      level: 'normal',
    }));
  }

  info(): RoomInfo {
    return {
      roomId: this.id,
      code: this.code,
      hostId: this.hostId,
      seats: this.seats.map(({ level: _l, ...s }) => s),
      rules: this.rules,
      status: this.status === 'starting' ? 'waiting' : this.status,
      kind: this.kind,
      table: this.table,
      entry: this.entry,
      sides: this.sides,
      mode: this.mode,
      endsAt: this.endsAt,
    };
  }

  seatOf(playerId: string): number {
    return this.seats.findIndex((s) => s.playerId === playerId);
  }

  humans(): string[] {
    return this.seats.flatMap((s) => (s.playerId ? [s.playerId] : []));
  }

  isFull(): boolean {
    return this.seats.every((s) => s.playerId);
  }

  /** Sienta a un jugador (solo antes de empezar). */
  addPlayer(h: Hello, conn: Conn): number | string {
    if (this.status !== 'waiting') return 'La partida ya empezó';
    const existing = this.seatOf(h.playerId);
    if (existing >= 0) {
      this.conns.set(h.playerId, conn);
      return existing;
    }
    const free = this.seats.findIndex((s) => !s.playerId);
    if (free < 0) return 'La mesa está llena';
    Object.assign(this.seats[free]!, { playerId: h.playerId, name: h.name.slice(0, 14) || 'Jugador', avatar: h.avatar || '🙂', kind: 'human', connected: true });
    this.conns.set(h.playerId, conn);
    this.broadcastRoom();
    return free;
  }

  /** Quita a un jugador antes de empezar, o lo reemplaza por la IA si ya se está jugando. */
  leave(playerId: string) {
    const i = this.seatOf(playerId);
    if (i < 0) return;
    this.conns.delete(playerId);
    if (this.status === 'waiting') {
      Object.assign(this.seats[i]!, { playerId: null, name: '', avatar: '', kind: 'bot', connected: false });
      this.broadcastRoom();
      return;
    }
    this.replaceWithBot(i, `${this.seats[i]!.name} abandonó: la máquina juega por él`);
  }

  /** Conexión caída: tiempo de gracia antes de que la IA lo reemplace. */
  detach(playerId: string) {
    const i = this.seatOf(playerId);
    if (i < 0) return;
    this.conns.delete(playerId);
    const seat = this.seats[i]!;
    seat.connected = false;
    if (this.status === 'waiting') {
      this.leave(playerId);
      return;
    }
    if (this.status !== 'playing' || seat.replaced) return;
    this.notice(`${seat.name} se desconectó… lo esperamos ${Math.round(this.timing.graceMs / 1000)} s`);
    this.grace.set(
      playerId,
      setTimeout(() => {
        this.grace.delete(playerId);
        if (!this.seats[i]!.connected) this.replaceWithBot(i, `${seat.name} no volvió: la máquina juega por él`);
      }, this.timing.graceMs),
    );
  }

  /** Reconexión: se vuelve a sentar y recibe el estado completo. */
  attach(playerId: string, conn: Conn): boolean {
    const i = this.seatOf(playerId);
    if (i < 0 || this.status === 'over' || this.seats[i]!.left) return false;
    this.conns.set(playerId, conn);
    const seat = this.seats[i]!;
    seat.connected = true;
    const g = this.grace.get(playerId);
    if (g) clearTimeout(g);
    this.grace.delete(playerId);
    if (seat.replaced) {
      // Vuelve a tomar el control de sus fichas.
      seat.replaced = false;
      seat.kind = 'human';
    }
    if (this.state) {
      conn.emit('sync', { state: sanitizeState(this.state), events: [], deadlines: this.deadlines(), room: this.info(), mySeat: i });
      this.notice(`${seat.name} volvió a la mesa`);
      this.schedule();
    } else conn.emit('room', this.info());
    return true;
  }

  start(): void | Promise<void> {
    if (this.status !== 'waiting') return;
    let b = 0;
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    for (const s of this.seats) {
      if (!s.playerId) {
        s.name = names[b % names.length]!;
        s.avatar = BOT_AVATARS[randomInt(BOT_AVATARS.length)]!;
        s.kind = 'bot';
        s.level = this.botLevel ?? (b % 2 ? 'expert' : 'normal');
        b++;
      }
    }
    // Cobro de la entrada (en el servidor): quien no tenga monedas queda reemplazado por la máquina.
    if (this.entry > 0 && this.charge) {
      const charge = this.charge;
      this.status = 'starting';
      return Promise.all(this.seats.map((s) => (s.playerId ? Promise.resolve(charge(s.playerId, this.entry)).catch(() => false) : true))).then((paid) => {
        if (this.status !== 'starting') return;
        this.seats.forEach((s, i) => {
          if (s.playerId && !paid[i]) {
            this.conns.get(s.playerId)?.emit('notice', { text: 'Te faltan monedas' });
            this.conns.delete(s.playerId);
            Object.assign(s, { playerId: null, kind: 'bot', name: names[b++ % names.length]!, level: this.botLevel ?? 'normal' });
          }
        });
        this.begin();
      });
    }
    this.begin();
  }

  /** Reparte y empieza la partida (después del cobro). */
  private begin(): void {
    this.state = createGame({
      sides: this.sides,
      rules: this.rules,
      seed: randomInt(2 ** 31),
      players: this.seats.map((s) => ({ name: s.name, side: s.side, isBot: s.kind === 'bot' })),
    });
    this.status = 'playing';
    this.startedAt = Date.now();
    if (this.timeLimitMs > 0) {
      this.endTimer = setTimeout(() => {
        if (this.status === 'playing') this.apply({ type: 'TIME_UP' });
      }, this.timeLimitMs);
    }
    this.schedule();
    this.seats.forEach((s, i) => {
      if (s.playerId) this.conns.get(s.playerId)?.emit('sync', { state: sanitizeState(this.state!), events: [], deadlines: this.deadlines(), room: this.info(), mySeat: i });
    });
  }

  /** Acción enviada por un cliente: se valida que sea suya y de un tipo permitido. */
  handleAction(playerId: string, action: Action): { ok: boolean; error?: string } {
    if (this.status !== 'playing' || !this.state) return { ok: false, error: 'No hay partida en curso' };
    const seat = this.seatOf(playerId);
    if (seat < 0) return { ok: false, error: 'No estás en esta mesa' };
    if (this.seats[seat]!.replaced) return { ok: false, error: 'La máquina está jugando por ti' };
    let clean: Action;
    switch (action?.type) {
      case 'ROLL':
        clean = { type: 'ROLL', player: seat }; // nunca se aceptan dados del cliente
        break;
      case 'MOVE':
        clean = { type: 'MOVE', player: seat, move: action.move };
        break;
      case 'SOPLAR':
        clean = { type: 'SOPLAR', player: seat };
        break;
      default:
        return { ok: false, error: 'Acción no permitida' };
    }
    if (clean.type !== 'SOPLAR' && this.state.current !== seat) return { ok: false, error: 'No es tu turno' };
    return this.apply(clean);
  }

  chat(playerId: string, text: string) {
    const seat = this.seatOf(playerId);
    if (seat < 0) return;
    const t = String(text).slice(0, 60);
    for (const c of this.conns.values()) c.emit('chat', { seat, text: t });
  }

  destroy() {
    this.clearTimers();
    if (this.endTimer) clearTimeout(this.endTimer);
    for (const g of this.grace.values()) clearTimeout(g);
    this.grace.clear();
  }

  // ---------- internos ----------

  private apply(action: Action): { ok: boolean; error?: string } {
    const r = applyAction(this.state!, action);
    if (!r.ok) return { ok: false, error: r.error };
    this.state = r.state;
    this.lastActivity = Date.now();
    this.schedule();
    this.broadcast(r.events);
    if (this.state.phase === 'over') this.finish();
    return { ok: true };
  }

  private broadcast(events: GameEvent[]) {
    const msg = { state: sanitizeState(this.state!), events, deadlines: this.deadlines() };
    for (const c of this.conns.values()) c.emit('update', msg);
  }

  private broadcastRoom() {
    const info = this.info();
    for (const c of this.conns.values()) c.emit('room', info);
  }

  private notice(text: string) {
    for (const c of this.conns.values()) c.emit('notice', { text });
  }

  private deadlines() {
    const now = Date.now();
    return {
      turnMs: this.turnEndsAt ? Math.max(0, this.turnEndsAt - now) : null,
      soploMs: this.soploEndsAt ? Math.max(0, this.soploEndsAt - now) : null,
    };
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }

  private isBotSeat(i: number): boolean {
    const s = this.seats[i]!;
    return s.kind === 'bot' || s.replaced;
  }

  private replaceWithBot(i: number, text: string) {
    const s = this.seats[i]!;
    if (s.replaced) return;
    s.replaced = true;
    s.connected = false;
    s.level = 'normal';
    // Online entre personas (sin parejas): quien se va queda fuera y los demás siguen jugando.
    const g = this.state;
    if (this.mode === 'online' && g && !g.rules.teams && g.phase !== 'over') {
      s.left = true;
      this.notice(`${s.name} salió de la partida`);
      if (this.seats.every((x) => !x.playerId || x.replaced)) {
        this.status = 'over';
        this.destroy();
        this.onEnd?.(this, []);
        return;
      }
      this.apply({ type: 'RESIGN', player: i });
      return;
    }
    this.notice(text);
    if (this.seats.every((x) => !x.playerId || x.replaced)) {
      // Ya no queda ningún humano: se cierra la mesa.
      this.status = 'over';
      this.destroy();
      this.onEnd?.(this, []);
      return;
    }
    this.schedule();
  }

  /** Bots, temporizador de turno y ventana de soplo (como el cliente local, pero con autoridad). */
  private schedule() {
    this.clearTimers();
    const g = this.state;
    if (!g || this.status !== 'playing') return;
    this.turnEndsAt = null;
    if (g.phase === 'over') {
      this.soploEndsAt = null;
      return;
    }

    let soploOpen = false;
    if (g.pendingSoplo) {
      soploOpen = true;
      const key = JSON.stringify(g.pendingSoplo);
      if (key !== this.soploKey || !this.soploEndsAt) {
        this.soploKey = key;
        this.soploEndsAt = Date.now() + this.timing.soploMs;
      }
      this.later(() => this.apply({ type: 'DISMISS_SOPLO' }), Math.max(0, this.soploEndsAt - Date.now()));
      g.players.forEach((_, i) => {
        if (!this.isBotSeat(i) || canSoplar(g, i) !== null) return;
        const level = this.seats[i]!.level;
        this.later(() => {
          if (this.state?.pendingSoplo && shouldSoplar(this.state, i, level)) this.apply({ type: 'SOPLAR', player: i });
        }, Math.min(this.timing.soploMs * 0.8, this.timing.botDelayMs * (level === 'expert' ? 1 : 2)));
      });
    } else {
      this.soploEndsAt = null;
      this.soploKey = null;
    }

    const cur = g.current;
    if (this.isBotSeat(cur)) {
      if (soploOpen) return;
      const level = this.seats[cur]!.level;
      this.later(() => {
        if (!this.state || this.state.current !== cur) return;
        const a = autoAction(this.state, level);
        if (a) this.apply(a);
      }, this.timing.botDelayMs);
      return;
    }

    this.turnEndsAt = Date.now() + this.timing.turnMs;
    this.later(() => {
      if (!this.state || this.state.current !== cur) return;
      const a = autoAction(this.state, 'normal');
      if (a) this.apply(a);
    }, this.timing.turnMs);
  }

  /** Momento en que termina el Modo Rápido (para el reloj del cliente). */
  get endsAt(): number | null {
    return this.endTimer ? this.startedAt + this.timeLimitMs : null;
  }
  private startedAt = Date.now();

  private finish() {
    this.status = 'over';
    this.clearTimers();
    if (this.endTimer) clearTimeout(this.endTimer);
    const g = this.state!;
    const winnerTeam = g.players[g.ranking[0]!]?.team ?? null;
    const results: HumanResult[] = [];
    g.ranking.forEach((i, place) => {
      const s = this.seats[i]!;
      if (!s.playerId) return;
      const pl = g.players[i]!;
      results.push({ playerId: s.playerId, place, won: g.rules.teams ? pl.team === winnerTeam : place === 0, stats: pl.stats });
    });
    this.onEnd?.(this, results);
  }
}

/** Código de mesa privada (sin letras confusas). */
export function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join('');
}
