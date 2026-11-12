/** Solo desarrollo (#galeria): todos los tableros, fichas y dados para revisar los gráficos. */
import { ITEMS } from '@parques/engine';
import { BoardMini } from '../game/Board';
import { PieceGlyph } from '../game/Piece';
import { Cube } from '../game/Dice';
import { GlobalDefs } from '../components/GlobalDefs';

export function Gallery() {
  const boards = ITEMS.filter((i) => i.board);
  const pieces = ITEMS.filter((i) => i.pieces);
  const dice = ITEMS.filter((i) => i.dice);
  return (
    <div style={{ padding: 12, background: '#1a1033', color: '#fff', fontFamily: 'sans-serif' }}>
      <GlobalDefs />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {boards.map((b) => (
          <div key={b.id} style={{ textAlign: 'center', fontSize: 12 }}>
            <BoardMini theme={b.board!} id={b.id} />
            {b.name}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {pieces.map((p) => (
          <svg key={p.id} viewBox="-30 -60 60 70" width={70} height={80}>
            <PieceGlyph color={['rojo', 'azul', 'verde', 'amarillo'][p.id.length % 4] as 'rojo'} style={p.pieces!} img={p.piecesImg} />
          </svg>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
        {dice.map((d, i) => (
          <Cube key={d.id} value={(i % 6) + 1} skin={d.dice!} size={50} />
        ))}
      </div>
    </div>
  );
}
