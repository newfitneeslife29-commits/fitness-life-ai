import { describe, expect, it } from 'vitest';
import { Store } from '../src/store';

describe('eliminar cuenta (exigido por Apple y Google)', () => {
  it('borra el perfil, la sesión, las identidades y deja de poder entrar', async () => {
    const s = new Store();
    const a = await s.createAccount();
    const b = await s.createAccount();
    await s.linkIdentity('apple', 'sub-123', a.id, 'x@example.com');
    const db = await (s as unknown as { db: Promise<{ query: (q: string, p?: unknown[]) => Promise<unknown[]> }> }).db;
    await db.query('INSERT INTO parques.messages (sender, receiver, text) VALUES ($1, $2, $3)', [a.id, b.id, 'hola']);
    await db.query('INSERT INTO parques.purchases (grant_id, player, product, source) VALUES ($1, $2, $3, $4)', ['tx1', a.id, 'coins_s', 'apple']);
    expect(await s.deleteAccount(a.id)).toBe(true);
    expect(await s.auth(a.id, a.token)).toBeNull();
    expect(await s.getProfile(a.id)).toBeNull();
    expect(await s.accountFor('apple', 'sub-123')).toBeNull();
    expect(await db.query('SELECT 1 FROM parques.messages WHERE sender = $1 OR receiver = $1', [a.id])).toHaveLength(0);
    // La compra queda solo como registro anónimo.
    const [pur] = (await db.query('SELECT player FROM parques.purchases WHERE grant_id = $1', ['tx1'])) as { player: string }[];
    expect(pur?.player).toBe('eliminada');
    // La otra cuenta sigue intacta y borrar dos veces no falla.
    expect((await s.getProfile(b.id))?.id).toBe(b.id);
    expect(await s.deleteAccount(a.id)).toBe(false);
    await s.close();
  });
});
