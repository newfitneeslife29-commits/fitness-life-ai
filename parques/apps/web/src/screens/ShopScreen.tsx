import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { CoinIcon, GemIcon } from '../components/Counter';
import { CATEGORY_NAMES, COIN_PACKS, ITEMS, type Category, type Item } from '../meta/catalog';
import { activeSeason, SEASONS } from '../meta/seasons';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { Avatar } from '../components/Avatar';
import { DieFace } from '../game/Dice';
import { PieceGlyph } from '../game/Piece';

const CATS: Category[] = ['board', 'dice', 'pieces', 'frame', 'effect'];

/** Vista previa de un objeto de la tienda. */
function Preview({ it }: { it: Item }) {
  const avatar = useProfile((p) => p.avatar);
  if (it.board) {
    const b = it.board;
    return (
      <svg viewBox="0 0 100 100" className="prev-svg">
        <rect x="4" y="4" width="92" height="92" rx="14" fill={b.frame} />
        <rect x="10" y="10" width="80" height="80" rx="9" fill={b.sky[1]} />
        <rect x="40" y="10" width="20" height="80" fill="#fff" opacity=".85" />
        <rect x="10" y="40" width="80" height="20" fill="#fff" opacity=".85" />
        <rect x="46" y="10" width="8" height="30" fill="var(--azul)" />
        <rect x="46" y="60" width="8" height="30" fill="var(--rojo)" />
        <rect x="10" y="46" width="30" height="8" fill="var(--amarillo)" />
        <rect x="60" y="46" width="30" height="8" fill="var(--verde)" />
        <path d="M10 10h28v22a6 6 0 0 1-6 6H10z" fill="var(--azul)" />
        <path d="M90 10H62v22a6 6 0 0 0 6 6h22z" fill="var(--verde)" />
        <path d="M90 90H62V68a6 6 0 0 1 6-6h22z" fill="var(--rojo)" />
        <path d="M10 90h28V68a6 6 0 0 0-6-6H10z" fill="var(--amarillo)" />
        <circle cx="50" cy="50" r="11" fill={b.circle[1]} stroke="#fff" strokeWidth="2.5" />
        <text x="50" y="54" textAnchor="middle" fontSize="11">{it.emoji}</text>
      </svg>
    );
  }
  if (it.dice) return <div className="prev-dice"><DieFace value={5} skin={it.dice} size={54} /><DieFace value={1} skin={it.dice} size={54} /></div>;
  if (it.pieces) return (
    <svg viewBox="-60 -30 120 60" className="prev-svg wide">
      {(['amarillo', 'azul', 'rojo'] as const).map((c, i) => (
        <g key={c} transform={`translate(${(i - 1) * 40} 0)`}>
          <PieceGlyph color={c} style={it.pieces!} r={17} />
        </g>
      ))}
    </svg>
  );
  if (it.frame) return <Avatar emoji={avatar} frameId={it.id} size={70} />;
  return <span className="prev-emoji">{it.emoji}</span>;
}

export function ShopScreen() {
  const t = useT();
  const p = useProfile();
  const fx = useFx();
  const [cat, setCat] = useState<Category | 'packs'>('board');
  const season = activeSeason();
  const list = cat === 'packs' ? [] : ITEMS.filter((i) => i.category === cat);

  const buy = (it: Item, el: HTMLElement) => {
    const r = p.buy(it.id);
    if (!r.ok) {
      fx.toast({ icon: '🙅', title: r.error ?? 'No se pudo comprar' });
      return;
    }
    play('coin');
    p.equip(it.id);
    fx.toast({ icon: it.emoji, title: `¡${it.name} es tuyo!`, sub: 'Ya lo tienes equipado' });
    const c = centerOf(el);
    fx.fly('xp', c, 4);
  };

  return (
    <div className="screen shop-screen with-nav">
      <TopBar back title={t('Tienda')} />
      {season ? (
        <div className="season-strip" style={{ ['--sa' as string]: season.colors[0], ['--sb' as string]: season.colors[1] }}>
          {season.emoji} <b>{season.name}</b>: {season.blurb}
        </div>
      ) : null}
      <div className="cat-tabs">
        {CATS.map((c) => (
          <button key={c} className={c === cat ? 'on' : ''} onClick={() => { play('tap'); setCat(c); }}>
            {CATEGORY_NAMES[c]}
          </button>
        ))}
        <button className={cat === 'packs' ? 'on' : ''} onClick={() => setCat('packs')}>
          Monedas
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={cat} className="shop-grid" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          {cat === 'packs'
            ? COIN_PACKS.map((pack) => (
                <motion.div key={pack.gems} className="shop-item card glossy" whileHover={{ y: -4 }}>
                  <span className="prev-emoji">💰</span>
                  <span className="si-name">{pack.coins.toLocaleString('es-CO')} monedas</span>
                  <button
                    className="btn3d small green"
                    onClick={(e) => {
                      if (p.gems < pack.gems) return fx.toast({ icon: '💎', title: 'Te faltan gemas', sub: 'Gánalas con logros, misiones y la ruleta' });
                      p.addCurrency(pack.coins, -pack.gems);
                      play('coin');
                      fx.fly('coin', centerOf(e.currentTarget), 12);
                    }}
                  >
                    <GemIcon size={16} /> {pack.gems}
                  </button>
                </motion.div>
              ))
            : list.map((it) => {
                const owned = p.owned.includes(it.id);
                const equipped = p.equipped[it.category] === it.id;
                const seasonItem = it.season ? SEASONS.find((s) => s.id === it.season) : null;
                const unavailable = !!it.season && season?.id !== it.season && !owned;
                return (
                  <motion.div key={it.id} className={`shop-item card glossy ${equipped ? 'equipped' : ''}`} whileHover={{ y: -4 }} layout>
                    {seasonItem ? <span className="si-tag" style={{ background: seasonItem.colors[0] }}>{seasonItem.emoji} Temporada</span> : null}
                    <div className="si-prev">
                      <Preview it={it} />
                    </div>
                    <span className="si-name">{it.name}</span>
                    {equipped ? (
                      <span className="si-state">✓ {t('En uso')}</span>
                    ) : owned ? (
                      <button className="btn3d small blue" onClick={() => { play('tap'); p.equip(it.id); }}>
                        {t('Usar')}
                      </button>
                    ) : unavailable ? (
                      <span className="si-state muted">Vuelve en {seasonItem?.name}</span>
                    ) : (
                      <button className="btn3d small" onClick={(e) => buy(it, e.currentTarget)}>
                        {it.currency === 'coins' ? <CoinIcon size={16} /> : <GemIcon size={16} />} {it.price.toLocaleString('es-CO')}
                      </button>
                    )}
                  </motion.div>
                );
              })}
        </motion.div>
      </AnimatePresence>
      <p className="rule-note">Monedas y gemas son solo del juego: no hay compras con dinero real.</p>
      <BottomNav />
    </div>
  );
}
