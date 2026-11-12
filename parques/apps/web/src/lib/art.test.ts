import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ITEMS } from '@parques/engine';

const ART = join(__dirname, '../../public/art');
const COLORS = ['amarillo', 'azul', 'rojo', 'verde'];

/** Ninguna skin de la tienda puede apuntar a una imagen que no existe (se vería rota). */
describe('arte de la tienda', () => {
  it('cada tablero, ficha, dado y avatar con arte tiene su imagen', () => {
    const missing: string[] = [];
    for (const it of ITEMS) {
      if (it.board?.image && !existsSync(join(ART, 'boards', `${it.board.image}.webp`))) missing.push(`${it.id} → boards/${it.board.image}`);
      if (it.dice?.texture && !existsSync(join(ART, 'dice', `${it.dice.texture}.webp`))) missing.push(`${it.id} → dice/${it.dice.texture}`);
      if (it.avatarImg && !existsSync(join(ART, 'avatars', `${it.avatarImg}.webp`))) missing.push(`${it.id} → avatars/${it.avatarImg}`);
      if (it.piecesImg) for (const c of COLORS) if (!existsSync(join(ART, 'pieces', `${it.piecesImg}-${c}.webp`))) missing.push(`${it.id} → pieces/${it.piecesImg}-${c}`);
    }
    expect(missing).toEqual([]);
  });
});
