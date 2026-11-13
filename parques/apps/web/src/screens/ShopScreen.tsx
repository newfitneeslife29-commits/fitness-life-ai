import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatUsd, PRODUCTS, ITEM_PRICES_USD, dailyDeals, dayKey, CHESTS, GEM_EXCHANGE, item, EVENTS } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { CoinIcon, GemIcon } from '../components/Counter';
import { CATEGORY_NAMES, EMOTES, ITEMS, type Category, type Item } from '@parques/engine';
import { activeSeason, SEASONS } from '@parques/engine';
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

type Tab = 'offers' | Category | 'coins' | 'gems';
const TABS: Tab[] = ['offers', 'coins', 'gems', 'board', 'avatar', 'pieces', 'dice', 'frame', 'effect'];

function untilMidnight(): string {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const ms = end.getTime() - now.getTime();
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

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
          <PieceGlyph color={c} style={it.pieces!} r={17} img={it.piecesImg} />
        </g>
      ))}
    </svg>
  );
  if (it.frame) return <Avatar emoji={p.avatar} photo={p.photo} frameId={it.id} size={70} />;
  if (it.category === 'avatar') return <Avatar emoji={`av:${it.id}`} size={84} />;
  return <span className="prev-emoji">{it.emoji}</span>;
}

export function ShopScreen() {
  const t = useT();
  const p = useProfile();
  const fx = useFx();
  const go = useApp((a) => a.go);
  const [tab, setTab] = useState<Tab>('offers');
  const [reveal, setReveal] = useState<{ itemId: string | null; coins: number } | null>(null);

  const buyDeal = async (itemId: string, el: HTMLElement) => {
    const c = centerOf(el);
    const r = await p.buyDeal(itemId);
    if (!r.ok) {
      fx.toast({ icon: '🙅', title: t(r.error ?? 'No se pudo comprar') });
      if (r.error === 'Te faltan monedas') setTab('coins');
      return;
    }
    play('coin');
    fx.fly('xp', c, 4);
    fx.toast({ icon: '🏷️', title: t('¡{name} es tuyo!', { name: t(item(itemId).name) }), sub: t('Ya lo tienes equipado') });
  };

  const openChest = async (chestId: string) => {
    const r = await p.openChest(chestId);
    if (!r.ok || !r.result) {
      fx.toast({ icon: '💎', title: t(r.error ?? 'No se pudo abrir') });
      if (r.error === 'Te faltan gemas') setTab('gems');
      return;
    }
    play('win');
    setReveal(r.result);
  };

  const exchange = async (gems: number, el: HTMLElement) => {
    const c = centerOf(el);
    const r = await p.exchangeGems(gems);
    if (!r.ok) return fx.toast({ icon: '💎', title: t(r.error ?? 'Error') });
    play('coin');
    fx.fly('coin', c, 10);
  };
  const season = activeSeason();

  const buyCoins = async (it: Item, el: HTMLElement) => {
    const r = await p.buy(it.id);
    if (!r.ok) {
      fx.toast({ icon: '🙅', title: t(r.error ?? 'No se pudo comprar') });
      if (r.error === 'Te faltan monedas') setTab('coins');
      return;
    }
    play('coin');
    fx.toast({ icon: it.emoji, title: t('¡{name} es tuyo!', { name: t(it.name) }), sub: t('Ya lo tienes equipado') });
    fx.fly('xp', centerOf(el), 4);
  };

  const buyReal = async (productId: string) => {
    play('tap');
    await purchase(productId);
  };

  const items = tab === 'coins' || tab === 'gems' || tab === 'offers' ? [] : ITEMS.filter((i) => i.category === tab);
  const deals = dailyDeals(dayKey());
  const bundles = PRODUCTS.filter((x) => x.kind === 'bundle' && !(x.once && p.bundles.includes(x.id)));

  return (
    <div className="screen shop-screen with-nav">
      <TopBar back title={t('Tienda')} />
      {/* Banco: monedas y gemas siempre a la vista arriba */}
      <section className="bank-strip">
        <div className="bank-head">
          <span>🏦 {t('Recarga monedas y gemas')}</span>
          <button className="link-btn" onClick={() => { play('tap'); setTab('coins'); }}>
            {t('Ver todo')} ›
          </button>
        </div>
        <div className="bank-row">
          {PRODUCTS.filter((x) => x.kind === 'coins' || x.kind === 'gems').map((pack, i) => (
            <motion.button
              key={pack.id}
              className={`bank-pack ${pack.kind} ${pack.id === 'coins_l' || pack.id === 'gems_m' ? 'hot' : ''}`}
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 320, damping: 20 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => void buyReal(pack.id)}
            >
              {pack.id === 'coins_l' || pack.id === 'gems_m' ? <span className="bank-hot">🔥 {t('Popular')}</span> : null}
              <motion.span className="bank-icon" animate={{ y: [0, -4, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}>
                {pack.kind === 'coins' ? <CoinIcon size={34} /> : <GemIcon size={34} />}
              </motion.span>
              <b>{(pack.coins ?? pack.gems)!.toLocaleString()}</b>
              <span className="bank-price">{formatUsd(pack.usdCents)}</span>
            </motion.button>
          ))}
        </div>
      </section>
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
            {c === 'offers' ? `🔥 ${t('Ofertas')}` : c === 'coins' ? `🪙 ${t('Monedas')}` : c === 'gems' ? `💎 ${t('Gemas')}` : t(CATEGORY_NAMES[c])}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'offers' ? (
          <motion.div key="offers" className="offers" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <h3 className="section-title">
              🏷️ {t('Ofertas del día')} <small>· {t('se renuevan en {time}', { time: untilMidnight() })}</small>
            </h3>
            <div className="shop-grid">
              {deals.map((d, i) => {
                const it = item(d.itemId);
                const owned = p.owned.includes(d.itemId);
                return (
                  <motion.div key={d.itemId} className="shop-item card glossy deal" initial={{ y: 30, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
                    <span className="si-tag" style={{ background: '#e11d48' }}>-40 %</span>
                    <div className="si-prev">
                      <Preview it={it} />
                    </div>
                    <span className="si-name">{t(it.name)}</span>
                    <span className="was"><CoinIcon size={12} /> {d.was.toLocaleString()}</span>
                    {owned ? (
                      <span className="si-state">✓ {t('Lo tienes')}</span>
                    ) : (
                      <button className="btn3d small shine" onClick={(e) => buyDeal(d.itemId, e.currentTarget)}>
                        <CoinIcon size={16} /> {d.price.toLocaleString()}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {bundles.length ? (
              <>
                <h3 className="section-title">🎁 {t('Paquetes')}</h3>
                {bundles.map((b, i) => (
                  <motion.div key={b.id} className={`bundle card glossy b-${b.id}`} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08 }} whileHover={{ scale: 1.01 }}>
                    {b.badge ? <span className="si-tag" style={{ background: '#f59e0b' }}>{t(b.badge)}</span> : null}
                    <div className="bundle-items">
                      {(b.itemIds ?? []).map((id) => (
                        <span key={id} className="bundle-thumb">
                          <Preview it={item(id)} />
                        </span>
                      ))}
                    </div>
                    <div className="bundle-body">
                      <b>{t(b.name)}</b>
                      <span>
                        <CoinIcon size={16} /> {(b.coins ?? 0).toLocaleString()} · <GemIcon size={16} /> {b.gems}
                      </span>
                      <small>{(b.itemIds ?? []).map((id) => t(item(id).name)).join(' · ')}</small>
                    </div>
                    <button className="btn3d green shine" onClick={() => buyReal(b.id)}>
                      {formatUsd(b.usdCents)}
                    </button>
                  </motion.div>
                ))}
              </>
            ) : null}

            <h3 className="section-title">🧰 {t('Cofres sorpresa')}</h3>
            <div className="shop-grid">
              {CHESTS.map((c, i) => (
                <motion.div key={c.id} className={`shop-item card glossy chest c-${c.id}`} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.08 }}>
                  <motion.span className="chest-icon" animate={{ rotate: [0, -6, 6, 0], y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
                    {c.emoji}
                  </motion.span>
                  <span className="si-name">{t(c.name)}</span>
                  <small>{t('Un objeto que no tienes + monedas')}</small>
                  <button className="btn3d small purple" onClick={() => openChest(c.id)}>
                    <GemIcon size={16} /> {c.gems}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
        <motion.div key={tab} className={`shop-grid ${tab === 'board' ? 'boards' : ''}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          {tab === 'coins' || tab === 'gems'
            ? PRODUCTS.filter((x) => x.kind === tab).map((pack, i) => (
                <motion.div key={pack.id} className={`shop-item card glossy pack ${i === 2 ? 'best' : ''}`} initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                  {i === 2 ? <span className="si-tag" style={{ background: '#e11d48' }}>{t('Más popular')}</span> : null}
                  <span className="pack-icon">{tab === 'coins' ? <span className="coin-stack">{Array.from({ length: Math.min(4, i + 1) }, (_, k) => <CoinIcon key={k} size={30 + i * 3} />)}</span> : <GemIcon size={48 + i * 8} />}</span>
                  <span className="si-name">{(pack.coins ?? pack.gems)!.toLocaleString()} {tab === 'coins' ? t('monedas') : t('gemas')}</span>
                  <button className="btn3d small green" onClick={() => buyReal(pack.id)}>
                    {formatUsd(pack.usdCents)}
                  </button>
                </motion.div>
              ))
            : items.map((it, idx) => {
                const owned = p.owned.includes(it.id);
                const equipped = p.equipped[it.category] === it.id;
                const seasonItem = it.season ? SEASONS.find((s) => s.id === it.season) : null;
                const unavailable = !!it.season && season?.id !== it.season && !owned;
                const usd = ITEM_PRICES_USD[it.id];
                return (
                  <motion.div
                    key={it.id}
                    className={`shop-item card glossy ${equipped ? 'equipped' : ''}`}
                    initial={{ y: 26, opacity: 0, scale: 0.92 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(idx, 12) * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    layout
                  >
                    {seasonItem ? <span className="si-tag" style={{ background: seasonItem.colors[0] }}>{seasonItem.emoji} {t('Temporada')}</span> : null}
                    {it.currency === 'pass' ? <span className="si-tag" style={{ background: '#7c3aed' }}>🎟️ {t('Pase')}</span> : null}
                    {it.currency === 'event' ? <span className="si-tag" style={{ background: '#0ea5e9' }}>🎉 {t('Evento')}</span> : null}
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
                    ) : it.currency === 'event' ? (
                      <button className="btn3d small blue" onClick={() => go('events')}>
                        🎉 {t('Gánalo en: {name}', { name: t(EVENTS.find((e) => e.id === it.event)?.name ?? '') })}
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
        )}
      </AnimatePresence>
      {tab === 'gems' ? (
        <div className="card glossy exchange">
          <b>🔄 {t('Cambia gemas por monedas')}</b>
          <div className="exchange-row">
            {GEM_EXCHANGE.map((x) => (
              <button key={x.gems} className="btn3d small" onClick={(e) => exchange(x.gems, e.currentTarget)}>
                <GemIcon size={14} /> {x.gems} → <CoinIcon size={14} /> {x.coins.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <AnimatePresence>
        {reveal ? (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReveal(null)}>
            <motion.div className="modal card glossy chest-reveal" initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
              <motion.div className="reveal-rays" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
              <h2>{t('¡Te salió!')}</h2>
              {reveal.itemId ? (
                <>
                  <div className="si-prev big">
                    <Preview it={item(reveal.itemId)} />
                  </div>
                  <b>{t(item(reveal.itemId).name)}</b>
                </>
              ) : (
                <b>{t('¡Ya tienes todo! Te damos monedas')}</b>
              )}
              <span className="reveal-coins">
                + <CoinIcon size={18} /> {reveal.coins.toLocaleString()}
              </span>
              <button className="btn3d green" onClick={() => setReveal(null)}>
                {t('¡Bacano!')}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
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
