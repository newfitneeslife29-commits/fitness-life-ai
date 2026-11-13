/**
 * v1.2 social en el servidor: reportes y sanciones, mensajes directos, referidos, clubes (parches)
 * y consultas del panel de administración. Usa la misma base que `Store`.
 */
import {
  CLUB_CHEST,
  CLUB_COST,
  CLUB_EMOJIS,
  CLUB_MAX,
  cleanChat,
  dayKey,
  grantReferrer,
  grantReward,
  redeemReferral,
  REFERRAL,
  validClubName,
  weekKey,
} from '@parques/engine';
import type { ClubInfo, ClubMessage, ClubRow, DirectMessage, Profile } from '@parques/engine';
import { randomId, type Store } from './store';

const REPORT_REASONS = ['groserías', 'trampa', 'abandono', 'nombre ofensivo', 'otro'];

export class Social {
  constructor(private store: Store) {}

  private async q<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
    return (await this.store.sql()).query<T>(text, params);
  }

  // ------------------------------------------------------------ Reportes y sanciones
  async report(reporter: string, target: string, reason: string): Promise<{ ok: boolean; error?: string }> {
    const t = String(target ?? '').trim().toUpperCase().slice(0, 16);
    if (!t || t === reporter) return { ok: false, error: 'Jugador no válido' };
    if (!(await this.store.getProfile(t))) return { ok: false, error: 'Jugador no encontrado' };
    const r = REPORT_REASONS.includes(reason) ? reason : 'otro';
    const rows = await this.q('INSERT INTO parques.reports (reporter, target, reason, day) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id', [reporter, t, r, dayKey()]);
    return rows.length ? { ok: true } : { ok: false, error: 'Ya reportaste a este jugador hoy' };
  }

  /** ¿Está suspendido? Devuelve hasta cuándo (ms) o 0. */
  async bannedUntil(player: string): Promise<number> {
    const [b] = await this.q<{ until: Date }>('SELECT until FROM parques.bans WHERE player = $1', [player]);
    const until = b ? new Date(b.until).getTime() : 0;
    return until > Date.now() ? until : 0;
  }

  async ban(player: string, hours: number, reason: string) {
    if (hours <= 0) {
      await this.q('DELETE FROM parques.bans WHERE player = $1', [player]);
      return;
    }
    const until = new Date(Date.now() + hours * 3600_000);
    await this.q('INSERT INTO parques.bans (player, until, reason) VALUES ($1, $2, $3) ON CONFLICT (player) DO UPDATE SET until = $2, reason = $3', [player, until, reason.slice(0, 120)]);
  }

  // ------------------------------------------------------------ Mensajes directos
  async sendDm(from: Profile, to: string, text: string): Promise<{ ok: boolean; error?: string; msg?: DirectMessage }> {
    const target = await this.store.getProfile(String(to ?? '').toUpperCase());
    if (!target) return { ok: false, error: 'Jugador no encontrado' };
    if (target.blocked.includes(from.id) || from.blocked.includes(target.id)) return { ok: false, error: 'No puedes escribirle a este jugador' };
    if (!from.friends.some((f) => f.id === target.id)) return { ok: false, error: 'Solo puedes escribirle a tus amigos' };
    const clean = cleanChat(text, 200).trim();
    if (!clean) return { ok: false, error: 'Mensaje vacío' };
    const [recent] = await this.q<{ n: number }>("SELECT count(*)::int AS n FROM parques.messages WHERE sender = $1 AND at > now() - interval '1 minute'", [from.id]);
    if ((recent?.n ?? 0) >= 20) return { ok: false, error: 'Vas muy rápido, espera un momento' };
    const [row] = await this.q<{ at: Date }>('INSERT INTO parques.messages (sender, receiver, text) VALUES ($1, $2, $3) RETURNING at', [from.id, target.id, clean]);
    return { ok: true, msg: { from: from.id, to: target.id, text: clean, at: new Date(row!.at).getTime() } };
  }

  async dmHistory(me: string, other: string): Promise<DirectMessage[]> {
    const o = String(other ?? '').toUpperCase();
    const rows = await this.q<{ sender: string; receiver: string; text: string; at: Date }>(
      'SELECT sender, receiver, text, at FROM parques.messages WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1) ORDER BY at DESC LIMIT 60',
      [me, o],
    );
    return rows.reverse().map((r) => ({ from: r.sender, to: r.receiver, text: r.text, at: new Date(r.at).getTime() }));
  }

  // ------------------------------------------------------------ Referidos
  /** La cuenta nueva canjea el código de quien la invitó: premio a los dos. */
  async redeem(newbie: string, code: string): Promise<{ ok: boolean; error?: string; profile?: Profile; coins?: number; referrer?: string }> {
    const referrer = String(code ?? '').trim().toUpperCase().slice(0, 16);
    const [acc] = await this.q<{ created: Date }>('SELECT created FROM parques.accounts WHERE id = $1', [newbie]);
    if (!acc) return { ok: false, error: 'Cuenta no encontrada' };
    if (Date.now() - new Date(acc.created).getTime() > REFERRAL.windowMs) return { ok: false, error: 'Las invitaciones solo se canjean en los primeros días' };
    if (!(await this.store.getProfile(referrer))) return { ok: false, error: 'Código no válido' };
    const ins = await this.q('INSERT INTO parques.referrals (newbie, referrer) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING newbie', [newbie, referrer]);
    if (!ins.length) return { ok: false, error: 'Ya canjeaste una invitación' };
    const r = await this.store.update(newbie, (p) => redeemReferral(p, referrer));
    if (!r.ok) {
      await this.q('DELETE FROM parques.referrals WHERE newbie = $1', [newbie]);
      return { ok: false, error: r.error };
    }
    await this.store.update(referrer, (p) => grantReferrer(p));
    return { ok: true, profile: r.profile, coins: REFERRAL.newCoins, referrer };
  }

  // ------------------------------------------------------------ Clubes
  async clubOf(player: string): Promise<string | null> {
    const [m] = await this.q<{ club: string }>('SELECT club FROM parques.club_members WHERE player = $1', [player]);
    return m?.club ?? null;
  }

  async clubMembers(club: string): Promise<string[]> {
    return (await this.q<{ player: string }>('SELECT player FROM parques.club_members WHERE club = $1', [club])).map((r) => r.player);
  }

  async listClubs(search: string): Promise<ClubRow[]> {
    const wk = weekKey(new Date());
    const s = String(search ?? '').trim().slice(0, 20);
    return (
      await this.q<{ id: string; name: string; emoji: string; members: number; weekwins: number }>(
        `SELECT c.id, c.name, c.emoji,
           (SELECT count(*)::int FROM parques.club_members m WHERE m.club = c.id) AS members,
           COALESCE((SELECT sum(w.wins)::int FROM parques.club_wins w WHERE w.club = c.id AND w.week = $1), 0) AS weekwins
         FROM parques.clubs c WHERE ($2 = '' OR c.name ILIKE '%' || $2 || '%' OR c.id = upper($2))
         ORDER BY weekwins DESC, members DESC, c.created LIMIT 40`,
        [wk, s],
      )
    ).map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, members: r.members, weekWins: r.weekwins }));
  }

  async createClub(owner: string, name: string, emoji: string): Promise<{ ok: boolean; error?: string; profile?: Profile }> {
    const err = validClubName(name);
    if (err) return { ok: false, error: err };
    if (await this.clubOf(owner)) return { ok: false, error: 'Ya estás en un club' };
    const n = String(name).trim();
    const [dup] = await this.q('SELECT 1 FROM parques.clubs WHERE lower(name) = lower($1)', [n]);
    if (dup) return { ok: false, error: 'Ya existe un club con ese nombre' };
    const pay = await this.store.update(owner, (p) => (p.coins < CLUB_COST ? { ok: false as const, error: 'Te faltan monedas' } : grantReward(p, -CLUB_COST, 0)));
    if (!pay.ok) return { ok: false, error: pay.error };
    const id = randomId().slice(0, 6);
    try {
      await (await this.store.sql()).tx(async (q) => {
        await q.query('INSERT INTO parques.clubs (id, name, emoji, owner) VALUES ($1, $2, $3, $4)', [id, n, CLUB_EMOJIS.includes(emoji) ? emoji : CLUB_EMOJIS[0], owner]);
        await q.query("INSERT INTO parques.club_members (player, club, role) VALUES ($1, $2, 'owner')", [owner, id]);
      });
    } catch {
      await this.store.update(owner, (p) => grantReward(p, CLUB_COST, 0));
      return { ok: false, error: 'No se pudo crear el club' };
    }
    return { ok: true, profile: pay.profile };
  }

  async joinClub(player: string, club: string): Promise<{ ok: boolean; error?: string }> {
    if (await this.clubOf(player)) return { ok: false, error: 'Ya estás en un club' };
    const [c] = await this.q('SELECT id FROM parques.clubs WHERE id = $1', [String(club ?? '').toUpperCase()]);
    if (!c) return { ok: false, error: 'Club no encontrado' };
    const id = String(club).toUpperCase();
    const n = (await this.clubMembers(id)).length;
    if (n >= CLUB_MAX) return { ok: false, error: 'El club está lleno' };
    await this.q('INSERT INTO parques.club_members (player, club) VALUES ($1, $2) ON CONFLICT DO NOTHING', [player, id]);
    return { ok: true };
  }

  /** Salir del club. Si sale el dueño, el más antiguo queda de dueño; si no queda nadie, se borra. */
  async leaveClub(player: string): Promise<{ ok: boolean; error?: string }> {
    const club = await this.clubOf(player);
    if (!club) return { ok: false, error: 'No estás en un club' };
    await this.q('DELETE FROM parques.club_members WHERE player = $1', [player]);
    const [next] = await this.q<{ player: string }>('SELECT player FROM parques.club_members WHERE club = $1 ORDER BY joined LIMIT 1', [club]);
    if (!next) await this.q('DELETE FROM parques.clubs WHERE id = $1', [club]);
    else {
      const [own] = await this.q('SELECT 1 FROM parques.club_members WHERE club = $1 AND role = $2', [club, 'owner']);
      if (!own) {
        await this.q("UPDATE parques.club_members SET role = 'owner' WHERE player = $1", [next.player]);
        await this.q('UPDATE parques.clubs SET owner = $1 WHERE id = $2', [next.player, club]);
      }
    }
    return { ok: true };
  }

  async kick(owner: string, player: string): Promise<{ ok: boolean; error?: string }> {
    const club = await this.clubOf(owner);
    const [me] = await this.q<{ role: string }>('SELECT role FROM parques.club_members WHERE player = $1', [owner]);
    if (!club || me?.role !== 'owner') return { ok: false, error: 'Solo el dueño del club puede sacar miembros' };
    if (player === owner || (await this.clubOf(player)) !== club) return { ok: false, error: 'Jugador no válido' };
    await this.q('DELETE FROM parques.club_members WHERE player = $1', [player]);
    return { ok: true };
  }

  async clubInfo(player: string, online: (id: string) => boolean): Promise<ClubInfo | null> {
    const club = await this.clubOf(player);
    if (!club) return null;
    const wk = weekKey(new Date());
    const [c] = await this.q<{ id: string; name: string; emoji: string; owner: string }>('SELECT id, name, emoji, owner FROM parques.clubs WHERE id = $1', [club]);
    if (!c) return null;
    const rows = await this.q<{ id: string; name: string; avatar: string; level: number; rating: number; role: string; wins: number }>(
      `SELECT a.id, a.name, a.avatar, a.level, a.rating, m.role, COALESCE(w.wins, 0)::int AS wins
       FROM parques.club_members m JOIN parques.accounts a ON a.id = m.player
       LEFT JOIN parques.club_wins w ON w.week = $2 AND w.club = m.club AND w.player = m.player
       WHERE m.club = $1 ORDER BY wins DESC, a.rating DESC`,
      [club, wk],
    );
    const msgs = await this.q<{ sender: string; name: string; text: string; at: Date }>('SELECT sender, name, text, at FROM parques.club_messages WHERE club = $1 ORDER BY at DESC LIMIT 50', [club]);
    const claimed = (await this.q<{ tier: number }>('SELECT tier FROM parques.club_claims WHERE week = $1 AND player = $2', [wk, player])).map((r) => r.tier);
    const members = rows.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar, level: r.level, rating: r.rating, weekWins: r.wins, role: (r.role === 'owner' ? 'owner' : 'member') as 'owner' | 'member', online: online(r.id) }));
    return {
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      owner: c.owner,
      members: members.length,
      weekWins: members.reduce((t, m) => t + m.weekWins, 0),
      rows: members,
      messages: msgs.reverse().map((m) => ({ from: m.sender, name: m.name, text: m.text, at: new Date(m.at).getTime() })),
      claimed,
    };
  }

  async clubChat(p: Profile, text: string): Promise<{ ok: boolean; error?: string; club?: string; msg?: ClubMessage }> {
    const club = await this.clubOf(p.id);
    if (!club) return { ok: false, error: 'No estás en un club' };
    const clean = cleanChat(text, 160).trim();
    if (!clean) return { ok: false, error: 'Mensaje vacío' };
    const [row] = await this.q<{ at: Date }>('INSERT INTO parques.club_messages (club, sender, name, text) VALUES ($1, $2, $3, $4) RETURNING at', [club, p.id, p.name, clean]);
    return { ok: true, club, msg: { from: p.id, name: p.name, text: clean, at: new Date(row!.at).getTime() } };
  }

  /** Una victoria online de un miembro suma al cofre del club. */
  async clubWin(player: string) {
    const club = await this.clubOf(player);
    if (!club) return;
    await this.q('INSERT INTO parques.club_wins (week, club, player, wins) VALUES ($1, $2, $3, 1) ON CONFLICT (week, club, player) DO UPDATE SET wins = parques.club_wins.wins + 1', [weekKey(new Date()), club, player]);
  }

  async claimClubChest(player: string, tier: number): Promise<{ ok: boolean; error?: string; profile?: Profile; coins?: number; gems?: number }> {
    const club = await this.clubOf(player);
    if (!club) return { ok: false, error: 'No estás en un club' };
    const t = CLUB_CHEST[tier];
    if (!t) return { ok: false, error: 'Cofre desconocido' };
    const wk = weekKey(new Date());
    const [w] = await this.q<{ n: number }>('SELECT COALESCE(sum(wins), 0)::int AS n FROM parques.club_wins WHERE week = $1 AND club = $2', [wk, club]);
    if ((w?.n ?? 0) < t.wins) return { ok: false, error: `El club necesita ${t.wins} victorias esta semana` };
    const ins = await this.q('INSERT INTO parques.club_claims (week, club, player, tier) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING tier', [wk, club, player, tier]);
    if (!ins.length) return { ok: false, error: 'Ya cobraste este cofre' };
    const r = await this.store.update(player, (p) => grantReward(p, t.coins, t.gems));
    return r.ok ? { ok: true, profile: r.profile, coins: t.coins, gems: t.gems } : { ok: false, error: r.error };
  }

  // ------------------------------------------------------------ Panel de administración
  async adminStats() {
    const [a] = await this.q<{ total: number; today: number; week: number; games: number }>(
      `SELECT count(*)::int AS total,
         count(*) FILTER (WHERE created > now() - interval '1 day')::int AS today,
         count(*) FILTER (WHERE updated > now() - interval '7 days')::int AS week,
         COALESCE(sum(games), 0)::int AS games
       FROM parques.accounts`,
    );
    const [r] = await this.q<{ n: number }>("SELECT count(*)::int AS n FROM parques.reports WHERE status = 'open'");
    const [p] = await this.q<{ n: number }>("SELECT count(*)::int AS n FROM parques.purchases WHERE source <> 'demo'");
    const [c] = await this.q<{ n: number }>('SELECT count(*)::int AS n FROM parques.clubs');
    return { accounts: a?.total ?? 0, newToday: a?.today ?? 0, activeWeek: a?.week ?? 0, onlineGames: a?.games ?? 0, openReports: r?.n ?? 0, purchases: p?.n ?? 0, clubs: c?.n ?? 0 };
  }

  async adminFind(q: string) {
    const s = String(q ?? '').trim().slice(0, 30);
    const rows = await this.q<{ id: string; name: string; level: number; rating: number; games: number; created: Date; updated: Date; coins: number; gems: number }>(
      `SELECT id, name, level, rating, games, created, updated, (profile->>'coins')::bigint AS coins, (profile->>'gems')::int AS gems
       FROM parques.accounts WHERE id = upper($1) OR name ILIKE '%' || $1 || '%' ORDER BY updated DESC LIMIT 30`,
      [s],
    );
    const out = [];
    for (const r of rows) out.push({ ...r, coins: Number(r.coins), bannedUntil: await this.bannedUntil(r.id) });
    return out;
  }

  async adminReports() {
    return this.q<{ id: number; reporter: string; target: string; reason: string; at: Date; tname: string; count: number }>(
      `SELECT r.id, r.reporter, r.target, r.reason, r.at, a.name AS tname,
         (SELECT count(*)::int FROM parques.reports x WHERE x.target = r.target AND x.status = 'open') AS count
       FROM parques.reports r LEFT JOIN parques.accounts a ON a.id = r.target
       WHERE r.status = 'open' ORDER BY count DESC, r.at DESC LIMIT 100`,
    );
  }

  async resolveReports(target: string) {
    await this.q("UPDATE parques.reports SET status = 'done' WHERE target = $1", [target]);
  }
}
