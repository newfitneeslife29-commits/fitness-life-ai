import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatUsd, productFor } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { CoinIcon, GemIcon } from '../components/Counter';
import { PASS_TIERS, PASS_XP_PER_TIER, freeReward, passEndsAt, passSeasonName, premiumReward, tierFromXp, type PassReward } from '@parques/engine';
import { item } from '@parques/engine';
import { useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { useSettings } from '../stores/settingsStore';
import { locale, useT } from '../lib/i18n';
import { purchase } from '../lib/payments';
import { play } from '../audio/audio';
import { BoardMini } from '../game/Board';
import { PieceGlyph } from '../game/Piece';
import { Cube } from '../game/Dice';

function left(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${h}h`;
}

function rewardText(t: (s: string, v?: Record<string, string | number>) => string, r: PassReward): string {
  if (r.itemId) return t(item(r.itemId).name);
  if (r.gems) return t('{n} gemas', { n: r.gems });
  return t('{n} monedas', { n: (r.coins ?? 0).toLocaleString() });
}

function RewardArt({ r }: { r: PassReward }) {
  if (r.itemId) {
    const it = item(r.itemId);
    if (it.board) return <div className="pr-board"><BoardMini theme={it.board} id={`pass-${it.id}`} /></div>;
    if (it.pieces) return <svg viewBox="-25 -55 50 65" className="pr-svg"><PieceGlyph color="rojo" style={it.pieces} r={17} img={it.piecesImg} /></svg>;
    if (it.dice) return <Cube value={6} skin={it.dice} size={40} />;
    return <span className="pr-emoji">{r.icon}</span>;
  }
  if (r.gems) return <GemIcon size={34} />;
  return <CoinIcon size={34} />;
}

export function PassScreen() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const p = useProfile();
  const fx = useFx();
  const scroller = useRef<HTMLDivElement>(null);


  const pass = p.pass;
  const reached = tierFromXp(pass.xp);
  const into = pass.xp - reached * PASS_XP_PER_TIER;

  useEffect(() => {
    const el = scroller.current?.querySelector(`[data-tier="${Math.max(1, reached)}"]`) as HTMLElement | null;
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [reached]);

  const claim = async (tier: number, track: 'free' | 'premium', el: HTMLElement) => {
    const res = await p.claimPass(tier, track);
    if (!res.ok || !res.result) return fx.toast({ icon: '⚠️', title: t(res.error ?? 'Error') });
    const r = res.result.reward;
    play('coin');
    const c = centerOf(el);
    if (r.coins) fx.fly('coin', c, 8);
    if (r.gems) fx.fly('gem', c, 4);
    if (r.itemId) fx.toast({ icon: r.icon, title: t('¡Nuevo objeto!'), sub: rewardText(t, r) });
  };

  const premium = productFor('pass-premium')!;
  const elite = productFor('pass-elite')!;

  return (
    <div className="screen pass-screen">
      <TopBar back title={t('Pase de batalla')} />
      <motion.div className="pass-hero" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="ph-top">
          <motion.span className="ph-ticket" animate={{ rotate: [-8, 8, -8], y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
            🎟️
          </motion.span>
          <div>
            <h2>{passSeasonName(new Date(), locale(lang))}</h2>
            <small>{t('Termina en {time}', { time: left(passEndsAt() - Date.now()) })}</small>
          </div>
          {pass.premium ? <span className="ph-badge">👑 PREMIUM</span> : null}
        </div>
        <div className="ph-progress">
          <span className="ph-tier">{reached}</span>
          <div className="xpbar big">
            <motion.div className="xpbar-fill" initial={false} animate={{ width: `${reached >= PASS_TIERS ? 100 : (into / PASS_XP_PER_TIER) * 100}%` }} />
          </div>
          <span className="ph-next">{reached >= PASS_TIERS ? '✓' : `${into}/${PASS_XP_PER_TIER} XP`}</span>
        </div>
        <small className="ph-hint">{t('Cada partida suma XP al pase: las mesas más caras dan más.')}</small>
        {!pass.premium ? (
          <div className="ph-buy">
            <button className="btn3d shine" onClick={() => purchase(premium.id)}>
              👑 {t('Premium')} · {formatUsd(premium.usdCents)}
            </button>
            <button className="btn3d purple shine" onClick={() => purchase(elite.id)}>
              🚀 {t('Élite +10 niveles')} · {formatUsd(elite.usdCents)}
            </button>
          </div>
        ) : null}
      </motion.div>

      {!pass.premium ? (
        <div className="pass-showcase">
          <b>👑 {t('Lo que ganas con Premium')}</b>
          <div className="psc-row">
            {Array.from({ length: PASS_TIERS }, (_, i) => premiumReward(i + 1))
              .filter((r) => r.itemId)
              .map((r, i) => (
                <motion.div key={r.itemId} className="psc-item" initial={{ y: 20, opacity: 0 }} animate={{ y: [0, -6, 0], opacity: 1 }} transition={{ y: { duration: 2.4, repeat: Infinity, delay: i * 0.3 }, opacity: { delay: i * 0.08 } }}>
                  <RewardArt r={r} />
                  <small>{rewardText(t, r)}</small>
                </motion.div>
              ))}
          </div>
        </div>
      ) : null}

      <div className="pass-labels">
        <span>🆓 {t('Gratis')}</span>
        <span>👑 {t('Premium')}</span>
      </div>
      <div className="pass-track" ref={scroller}>
        {Array.from({ length: PASS_TIERS }, (_, i) => {
          const tier = i + 1;
          const unlocked = tier <= reached;
          const fr = freeReward(tier);
          const pr = premiumReward(tier);
          const fClaimed = pass.claimedFree.includes(tier);
          const pClaimed = pass.claimedPremium.includes(tier);
          return (
            <motion.div
              key={tier}
              className={`pass-col ${unlocked ? 'unlocked' : ''} ${tier === reached ? 'current' : ''}`}
              data-tier={tier}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: Math.min(Math.abs(tier - reached), 8) * 0.04 }}
            >
              <button className={`pass-cell free ${fClaimed ? 'claimed' : ''} ${unlocked && !fClaimed ? 'ready' : ''}`} disabled={!unlocked || fClaimed} onClick={(e) => claim(tier, 'free', e.currentTarget)}>
                <RewardArt r={fr} />
                <small>{rewardText(t, fr)}</small>
                {fClaimed ? <span className="pc-check">✓</span> : unlocked ? <span className="pc-claim">{t('Reclamar')}</span> : null}
              </button>
              <span className="pass-num">
                {tier}
                <span className="pass-line" />
              </span>
              <button className={`pass-cell premium ${pr.itemId ? 'big' : ''} ${pClaimed ? 'claimed' : ''} ${unlocked && !pClaimed && pass.premium ? 'ready' : ''}`} disabled={!unlocked || pClaimed || !pass.premium} onClick={(e) => claim(tier, 'premium', e.currentTarget)}>
                <RewardArt r={pr} />
                <small>{rewardText(t, pr)}</small>
                {!pass.premium ? <span className="pc-lock">🔒</span> : pClaimed ? <span className="pc-check">✓</span> : unlocked ? <span className="pc-claim">{t('Reclamar')}</span> : null}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
