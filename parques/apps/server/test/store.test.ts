import { describe, expect, it } from 'vitest';
import { Store } from '../src/store';

describe('Store (ranking y torneos)', () => {
  it('suma trofeos, victorias y puntos de torneo', () => {
    const s = new Store(null);
    for (const id of ['A', 'B', 'C', 'D']) s.upsertPlayer({ playerId: id, name: id, avatar: '🙂', country: id === 'D' ? 'MX' : 'CO' });
    s.recordMatch(['A', 'B', 'C', 'D']);
    s.recordMatch(['A', 'C', 'B', 'D']);
    const g = s.ranking('global');
    expect(g[0]!.playerId).toBe('A');
    expect(g[0]!.wins).toBe(2);
    expect(g[0]!.rating).toBe(1050);
    expect(s.ranking('country', 'MX').map((r) => r.playerId)).toEqual(['D']);
    expect(s.ranking('friends', undefined, ['B', 'C']).map((r) => r.playerId).sort()).toEqual(['B', 'C']);
    const t = s.tournament();
    expect(t.rows[0]).toMatchObject({ playerId: 'A', points: 20, games: 2 });
  });

  it('el premio de la semana pasada se reclama una sola vez y solo el top 3', () => {
    const s = new Store(null);
    for (const id of ['A', 'B', 'C', 'D']) s.upsertPlayer({ playerId: id, name: id, avatar: '🙂', country: 'CO' });
    const lastWeek = new Date(Date.now() - 7 * 86400000);
    s.recordMatch(['A', 'B', 'C', 'D'], lastWeek);
    expect(s.claimLastWeek('A')).toMatchObject({ ok: true, place: 1, coins: 5000 });
    expect(s.claimLastWeek('A').ok).toBe(false);
    expect(s.claimLastWeek('D').ok).toBe(false);
    expect(s.claimLastWeek('C')).toMatchObject({ ok: true, place: 3 });
  });
});
