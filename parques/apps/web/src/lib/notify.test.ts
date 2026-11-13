import { describe, expect, it } from 'vitest';
import { plannedReminders } from './notify';

describe('recordatorios locales', () => {
  it('regalo diario siempre; racha y cofre solo cuando aplican', () => {
    const base = plannedReminders({ daily: { lastClaim: null, streak: 0 }, winChest: { ready: 0 } }, '2026-11-13');
    expect(base.map((n) => n.id)).toEqual([101, 104]);
    const all = plannedReminders({ daily: { lastClaim: '2026-11-13', streak: 4 }, winChest: { ready: 1 } }, '2026-11-13');
    expect(all.map((n) => n.id)).toEqual([101, 102, 103, 104]);
    for (const n of all) expect(n.at.getTime()).toBeGreaterThan(Date.now());
  });
});
