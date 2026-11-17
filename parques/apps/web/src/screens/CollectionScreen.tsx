import { useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_NAMES, ITEMS, type Category } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { useApp } from '../stores/appStore';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';
import { Preview } from './ShopScreen';

const CATS: Category[] = ['board', 'dice', 'pieces', 'avatar', 'frame', 'effect', 'victory'];

/** "Mis cosas": todo lo que la persona tiene (comprado, ganado o gratis), por categoría, para usarlo. */
export function CollectionScreen() {
  const t = useT();
  const p = useProfile();
  const fx = useFx();
  const go = useApp((a) => a.go);
  const [cat, setCat] = useState<Category>('board');
  const mine = (c: Category) => ITEMS.filter((i) => i.category === c && p.owned.includes(i.id));
  const items = mine(cat);
  const totalOwned = ITEMS.filter((i) => p.owned.includes(i.id)).length;

  return (
    <div className="screen collection-screen with-nav">
      <TopBar back title={t('Mis cosas')} />
      <motion.section className="card glossy coll-head" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <span className="coll-icon">🎒</span>
        <span>
          <b>{t('Tu colección')}</b>
          <small>{t('{n} objetos · toca "Usar" para equiparlos', { n: totalOwned })}</small>
        </span>
      </motion.section>

      <div className="coll-tabs">
        {CATS.map((c) => (
          <button key={c} className={`chip-btn ${c === cat ? 'on' : ''}`} onClick={() => { play('tap'); setCat(c); }}>
            {t(CATEGORY_NAMES[c])} <b>{mine(c).length}</b>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <section className="card glossy setup-card center">
          <p className="rule-note">{t('Todavía no tienes objetos de esta categoría.')}</p>
          <button className="btn3d green" onClick={() => go('shop')}>
            🛍️ {t('Ir a la tienda')}
          </button>
        </section>
      ) : (
        <div className="shop-grid">
          {items.map((it, idx) => {
            const equipped = p.equipped[it.category] === it.id;
            return (
              <motion.div
                key={it.id}
                className={`shop-item card glossy ${equipped ? 'equipped' : ''}`}
                initial={{ y: 20, opacity: 0, scale: 0.94 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(idx, 10) * 0.04 }}
              >
                <div className="si-prev">
                  <Preview it={it} />
                </div>
                <span className="si-name">{t(it.name)}</span>
                {equipped ? (
                  <span className="si-state">✓ {t('En uso')}</span>
                ) : (
                  <button
                    className="btn3d small blue"
                    onClick={async () => {
                      play('tap');
                      const r = await p.equip(it.id);
                      if (r.ok) fx.toast({ icon: it.emoji, title: t('¡Listo! Ahora usas {name}', { name: t(it.name) }) });
                    }}
                  >
                    {t('Usar')}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
