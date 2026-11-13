import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { item } from '@parques/engine';
import type { GameState } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { Board } from '../game/Board';
import { loadReplay } from '../lib/replay';
import { shareMoment } from '../lib/share';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

const SPEEDS = [1, 2, 4];
const NONE = new Set<string>();

/** Repetición de la última partida: avanza jugada por jugada (play/pausa, velocidad y barra). */
export function ReplayScreen() {
  const t = useT();
  const fx = useFx();
  const p = useProfile();
  const replay = useMemo(() => loadReplay(), []);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const total = replay?.frames.length ?? 0;

  useEffect(() => {
    if (!playing || !replay) return;
    if (i >= total - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setI((x) => Math.min(total - 1, x + 1)), 650 / speed);
    return () => clearTimeout(id);
  }, [playing, i, speed, total, replay]);

  if (!replay) {
    return (
      <div className="screen replay-screen">
        <TopBar back title={t('Repetición')} />
        <section className="card glossy setup-card center">
          <span className="quick-hero">🎬</span>
          <p className="rule-note">{t('Todavía no hay una partida para repetir. ¡Juega una!')}</p>
        </section>
      </div>
    );
  }

  const f = replay.frames[i]!;
  const g: GameState = { ...replay.final, current: f.c, dice: f.d, diceUsed: [false, false], pendingSoplo: null, phase: i === total - 1 ? 'over' : 'playing' } as GameState;
  const eq = p.equipped;
  const me = replay.final.players[replay.me];
  const place = replay.final.ranking.indexOf(replay.me);
  const stats = me?.stats;

  const share = async () => {
    play('tap');
    const ok = await shareMoment({
      title: place === 0 ? t('¡Gané!') : t('¡Quedé {n}º!', { n: place + 1 }),
      subtitle: 'Parqués Colombia',
      name: p.name,
      avatar: p.avatar,
      playerId: p.id,
      stats: [
        { icon: '⚔️', label: t('Capturas'), value: String(stats?.captures ?? 0) },
        { icon: '👑', label: t('Coronadas'), value: String(stats?.crowned ?? 0) },
        { icon: '🎲', label: t('Pares'), value: String(stats?.pairs ?? 0) },
      ],
    });
    if (!ok) fx.toast({ icon: '⚠️', title: t('No se pudo compartir') });
  };

  return (
    <div className="screen replay-screen">
      <TopBar back title={t('Repetición')} />
      <div className="replay-board">
        <Board
          game={g}
          view={f.v}
          viewSide={replay.viewSide}
          movable={NONE}
          selected={null}
          targets={[]}
          fx={[]}
          onPiece={() => {}}
          onTarget={() => {}}
          theme={item(eq.board).board!}
          pieceStyle={item(eq.pieces).pieces!}
          pieceImg={item(eq.pieces).piecesImg}
          effect={item(eq.effect).effect!}
        />
      </div>
      <section className="card glossy replay-controls">
        <div className="rc-info">
          <span className="rc-turn" style={{ ['--pc' as string]: `var(--${replay.final.players[f.c]?.color ?? 'amarillo'})` }}>
            ● {replay.final.players[f.c]?.name}
          </span>
          {f.d ? (
            <span className="rc-dice">
              🎲 {f.d[0]} · {f.d[1]}
            </span>
          ) : null}
          <small>
            {i + 1}/{total}
          </small>
        </div>
        <input className="rc-bar" type="range" min={0} max={total - 1} value={i} onChange={(e) => { setI(Number(e.target.value)); setPlaying(false); }} />
        <div className="rc-btns">
          <button className="round-btn" onClick={() => { setI(0); setPlaying(true); }} aria-label={t('Desde el inicio')}>
            ⏮
          </button>
          <motion.button className="btn3d green" whileTap={{ scale: 0.92 }} onClick={() => { if (i >= total - 1) setI(0); setPlaying((x) => !x); }}>
            {playing ? `⏸ ${t('Pausa')}` : `▶ ${t('Reproducir')}`}
          </motion.button>
          <button className="round-btn" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!)}>
            ×{speed}
          </button>
        </div>
        <button className="btn3d purple wide shine" onClick={() => void share()}>
          📸 {t('Compartir momento')}
        </button>
      </section>
    </div>
  );
}
