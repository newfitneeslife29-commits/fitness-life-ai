import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatUsd, PRODUCTS, ITEM_PRICES_USD } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { CoinIcon, GemIcon } from '../components/Counter';
import { CATEGORY_NAMES, EMOTES, ITEMS, type Category, type Item } from '../meta/catalog';
import { activeSeason, SEASONS } from '../meta/seasons';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useApp } from '../stores/appStore';
import { useT } from '../lib/i18n';
import { purchase } from '../lib/payments';
import { play } from '../audio/audio';
import { Avatar } from '../components/Avatar';
import { DieFace } from '../game/Dice';
import { PieceGlyph } from '../game/Piece';
import { BoardMini } from '../game/Board';

type Tab = Category | 'coins' | 'gems';
const TABS: Tab[] = ['board', 'pieces', 'dice', 'frame', 'effect', 'coins', 'gems'];

/** Vista previa 3D de un objeto. */
function Preview({ it }: { it: Item }) {
  const p = useProfile();
  if (it.board) return <div className="si-board"><BoardMini theme={it.board} id={`shop-${it.id}`} /></div>;
  if (it.dice) return <div className="prev-dice"><DieFace value={5} skin={it.dice} size={48} /><DieFace value={6} skin={it.dice} size={48} /></div>;
  if (it.pieces) return (
    <svg viewBox="-70 -62 140 80" className="prev-svg wide">
      {(['amarillo', 'rojo', 'azul'] as const).map((c, i) => (
        <g key={c} transform={`translate(${(i - 1) * 42} ${i === 1 ? 8 : 0})`}>
          <ellipse cx={3} cy={7} rx={19} ry={8} fill="rgba(0,0,0,.35)" />
          <PieceGlyph color={c} style={it.pieces!} r={17} />
        </g>
      ))}
    </svg>
  );
  if (it.frame) return <Avatar emoji={p.avatar} photo={p.photo} frameId={it.id} size={70} />;
  return <span className="prev-emoji">{it.emoji}</span>;
}

export function ShopScreen() {
  const t = useT();
  const p = useProfile();
  const fx = useFx();
  const go = useApp((a) => a.go);
  const [tab, setTab] = useState<Tab>('board');
  const season = activeSeason();

  const buyCoins = (it: Item, el: HTMLElement) => {
    const r = p.buy(it.id);
    if (!r.ok) {
      fx.toast({ icon: '🙅', title: t(r.error ?? 'No se pudo comprar') });
      if (r.error === 'Te faltan monedas') setTab('coins');
      return;
    }
    play('coin');
    p.equip(it.id);
    fx.toast({ icon: it.emoji, title: t('¡{name} es tuyo!', { name: t(it.name) }), sub: t('Ya lo tienes equipado') });
    fx.fly('xp', centerOf(el), 4);
  };

  const buyReal = async (productId: string) => {
    play('tap');
    await purchase(productId);
  };

  const items = tab === 'coins' || tab === 'gems' ? [] : ITEMS.filter((i) => i.category === tab);

  return (
    <div className="screen shop-screen with-nav">
      <TopBar back title={t('Tienda')} />
      {season ? (
        <div className="season-strip" style={{ ['--sa' as string]: season.colors[0], ['--sb' as string]: season.colors[1] }}>
          {season.emoji} <b>{t(season.name)}</b>: {t(season.blurb)}
        </div>
      ) : null}
      <motion.button className="pass-strip" whileTap={{ scale: 0.97 }} onClick={() => go('pass')}>
        🎟️ <b>{t('Pase de batalla')}</b> — {t('skins exclusivas, monedas y gemas')} ›
      </motion.button>
      <div className="cat-tabs">
        {TABS.map((c) => (
          <button key={c} className={c === tab ? 'on' : ''} onClick={() => { play('tap'); setTab(c); }}>
            {c === 'coins' ? `🪙 ${t('Monedas')}` : c === 'gems' ? `💎 ${t('Gemas')}` : t(CATEGORY_NAMES[c])}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} className={`shop-grid ${tab === 'board' ? 'boards' : ''}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          {tab === 'coins' || tab === 'gems'
            ? PRODUCTS.filter((x) => x.kind === tab).map((pack, i) => (
                <motion.div key={pack.id} className={`shop-item card glossy pack ${i === 2 ? 'best' : ''}`} whileHover={{ y: -4 }}>
                  {i === 2 ? <span className="si-tag" style={{ background: '#e11d48' }}>{t('Más popular')}</span> : null}
                  <span className="pack-icon">{tab === 'coins' ? <span className="coin-stack">{Array.from({ length: Math.min(4, i + 1) }, (_, k) => <CoinIcon key={k} size={30 + i * 3} />)}</span> : <GemIcon size={48 + i * 8} />}</span>
                  <span className="si-name">{(pack.coins ?? pack.gems)!.toLocaleString()} {tab === 'coins' ? t('monedas') : t('gemas')}</span>
                  <button className="btn3d small green" onClick={() => buyReal(pack.id)}>
                    {formatUsd(pack.usdCents)}
                  </button>
                </motion.div>
              ))
            : items.map((it) => {
                const owned = p.owned.includes(it.id);
                const equipped = p.equipped[it.category] === it.id;
                const seasonItem = it.season ? SEASONS.find((s) => s.id === it.season) : null;
                const unavailable = !!it.season && season?.id !== it.season && !owned;
                const usd = ITEM_PRICES_USD[it.id];
                return (
                  <motion.div key={it.id} className={`shop-item card glossy ${equipped ? 'equipped' : ''}`} whileHover={{ y: -4 }} layout>
                    {seasonItem ? <span className="si-tag" style={{ background: seasonItem.colors[0] }}>{seasonItem.emoji} {t('Temporada')}</span> : null}
                    {it.currency === 'pass' ? <span className="si-tag" style={{ background: '#7c3aed' }}>🎟️ {t('Pase')}</span> : null}
                    <div className="si-prev">
                      <Preview it={it} />
                    </div>
                    <span className="si-name">{t(it.name)}</span>
                    {equipped ? (
                      <span className="si-state">✓ {t('En uso')}</span>
                    ) : owned ? (
                      <button className="btn3d small blue" onClick={() => { play('tap'); p.equip(it.id); }}>
                        {t('Usar')}
                      </button>
                    ) : unavailable ? (
                      <span className="si-state muted">{t('Vuelve en {name}', { name: t(seasonItem!.name) })}</span>
                    ) : it.currency === 'pass' ? (
                      <button className="btn3d small purple" onClick={() => go('pass')}>
                        🎟️ {t('En el pase')}
                      </button>
                    ) : it.currency === 'coins' ? (
                      <button className="btn3d small" onClick={(e) => buyCoins(it, e.currentTarget)}>
                        <CoinIcon size={16} /> {it.price.toLocaleString()}
                      </button>
                    ) : usd ? (
                      <button className="btn3d small green" onClick={() => buyReal(`item:${it.id}`)}>
                        {formatUsd(usd)}
                      </button>
                    ) : null}
                  </motion.div>
                );
              })}
        </motion.div>
      </AnimatePresence>
      {tab === 'gems' ? (
        <div className="card glossy emote-info">
          <b>💎 {t('Las gemas sirven para enviar emotes en la partida')}</b>
          <div className="emote-row">
            {EMOTES.map((e) => (
              <span key={e.id} className="emote-chip">
                {e.glyph} <small>{e.gems}💎</small>
              </span>
            ))}
          </div>
          <small>{t('El 1º lugar de cada mesa con apuesta gana 5 gemas.')}</small>
        </div>
      ) : null}
      <p className="rule-note">{t('Los pagos con dinero real se procesan de forma segura con Stripe. Las monedas no se pueden cambiar por dinero.')}</p>
      <BottomNav />
    </div>
  );
}
