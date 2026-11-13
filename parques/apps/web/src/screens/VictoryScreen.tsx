import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Confetti } from '../components/Confetti';
import { Avatar } from '../components/Avatar';
import { Mascot } from '../components/Mascot';
import { Background } from '../components/Background';
import { CoinIcon, CurrencyPill, GemIcon } from '../components/Counter';
import { humanSeat, useGame } from '../stores/gameStore';
import { useApp } from '../stores/appStore';
import { useLevel, useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { levelFromXp, payouts } from '@parques/engine';
import { play } from '../audio/audio';
import { useT } from '../lib/i18n';
import { useOnline } from '../lib/online';

export function VictoryScreen() {
  const { game, config, rematch, quit, outcome, online } = useGame();
  const go = useApp((a) => a.go);
  const profile = useProfile();
  const lvl = useLevel();
  const fx = useFx();
  const t = useT();
  const rewardsRef = useRef<HTMLDivElement>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [xpShown, setXpShown] = useState<number | null>(null);

  // Sonido de victoria / derrota al entrar.
  useEffect(() => {
    if (!game || !config) return;
    const me = game.players.findIndex((_, i) => humanSeat(config, game, i));
    const won = me >= 0 && (game.rules.teams ? game.players[game.ranking[0]!]!.team === game.players[me]!.team : game.ranking[0] === me);
    play(won || me < 0 ? 'win' : 'lose');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los premios los manda el servidor (puede tardar un instante): se animan al llegar.
  const shown = useRef(false);
  useEffect(() => {
    const res = outcome;
    if (!res || shown.current) return;
    shown.current = true;
    const before = Math.max(0, profile.xp - res.xp);
    setXpShown(before);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        const from = centerOf(rewardsRef.current);
        if (res.coins) {
          fx.fly('coin', from, Math.min(14, 4 + Math.round(res.coins / 60)));
          play('coin');
        }
        setXpShown(before + res.xp);
      }, 900),
    );
    if (res.levelAfter > res.levelBefore) {
      timers.push(
        setTimeout(() => {
          setLevelUp(res.levelAfter);
          play('levelup');
        }, 2400),
      );
    }
    if (res.gems) timers.push(setTimeout(() => { fx.fly('gem', centerOf(rewardsRef.current), 5); fx.toast({ icon: '💎', title: t('+{n} gemas por ganar', { n: res.gems }) }); }, 1500));
    res.achievements.slice(0, 4).forEach((a, i) => timers.push(setTimeout(() => fx.toast({ icon: a.badge, title: t('¡Logro desbloqueado!'), sub: `${t(a.name.replace(/ [IVXL]+$/, ''))} ${a.name.match(/[IVXL]+$/)?.[0] ?? ''} · +${a.coins} 🪙` }), 2200 + i * 900)));
    if (res.achievements.length > 4) timers.push(setTimeout(() => fx.toast({ icon: '🏅', title: t('+{n} logros más', { n: res.achievements.length - 4 }) }), 6000));
    res.missions.forEach((m, i) => timers.push(setTimeout(() => fx.toast({ icon: '🎯', title: t('Misión completada'), sub: `${t(m.text)} · ${t('reclámala en Eventos')}` }), 3200 + i * 900)));
    if (res.passTiersGained > 0) timers.push(setTimeout(() => fx.toast({ icon: '🎟️', title: t('¡Subiste {n} nivel(es) en el pase!', { n: res.passTiersGained }) }), 4200));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  if (!game || !config) return null;

  const ranking = game.ranking;
  const podium = [ranking[1], ranking[0], ranking[2]].filter((x): x is number => x !== undefined);
  const heights = { 0: 150, 1: 110, 2: 80 } as Record<number, number>;
  const me = game.players.findIndex((_, i) => humanSeat(config, game, i));
  const myPlace = me >= 0 ? ranking.indexOf(me) : -1;
  const won = game.rules.teams && me >= 0 ? game.players[ranking[0]!]!.team === game.players[me]!.team : myPlace === 0;
  const avatar = (i: number) => config.seats.find((s) => s.side === game.players[i]!.side)!.avatar;
  const xpLvl = levelFromXp(xpShown ?? profile.xp);
  const entry = outcome?.entry ?? 0;
  const pays = payouts(entry, game.players.length, !!game.rules.teams);

  return (
    <div className="screen victory-screen">
      <Background />
      {won || me < 0 ? <Confetti /> : null}
      <div className="victory-pills">
        <CurrencyPill kind="coin" value={profile.coins} />
        <CurrencyPill kind="gem" value={profile.gems} />
      </div>
      <motion.h1 className="victory-title" initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
        {me < 0 ? t('¡Partida terminada!') : won ? t('¡Ganaste, parce! 🎉') : myPlace >= 0 ? t('Quedaste {n}º', { n: myPlace + 1 }) : t('¡Buena partida!')}
      </motion.h1>
      {me >= 0 && !won ? <p className="victory-sub">{t('¡La próxima es tuya! Pilas con los soplos 😉')}</p> : null}

      {ranking[0] !== undefined ? (
        <WinnerShowcase
          avatar={avatar(ranking[0])}
          name={game.players[ranking[0]]!.name}
          color={`var(--${game.players[ranking[0]]!.color})`}
          frameId={ranking[0] === me ? profile.equipped.frame : undefined}
          label={game.rules.teams ? t('GANADORES') : t('GANADOR')}
        />
      ) : null}

      <div className="place-cards">
        {ranking.slice(1).map((i, k) => {
          const place = k + 2;
          const p = game.players[i]!;
          const prize = pays[game.rules.teams ? (game.players[i]!.team === game.players[ranking[0]!]!.team ? 0 : 2) : place - 1] ?? 0;
          return (
            <motion.div key={i} className={`place-card p${place} ${i === me ? 'me' : ''}`} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.9 + k * 0.15 }}>
              <Medal n={place} />
              <Avatar emoji={avatar(i)} size={46} color={`var(--${p.color})`} frameId={i === me ? profile.equipped.frame : undefined} />
              <span className="pc-name">
                <b className="pc-nm">{p.name}</b>
                <small>💥 {p.stats.captures} · 👑 {p.stats.crowned} · 🎲 {p.stats.pairs}</small>
              </span>
              {entry > 0 ? (
                <span className="pc-prize">
                  {prize.toLocaleString()} <CoinIcon size={20} />
                </span>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {outcome ? (
        <motion.div ref={rewardsRef} className="rewards card glossy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <div className="reward">
            <span className="reward-icon"><CoinIcon size={30} /></span>
            <span className="reward-val">{outcome.coins - outcome.entry >= 0 ? '+' : ''}{(outcome.coins - outcome.entry + outcome.levelCoins).toLocaleString()}</span>
            <span className="reward-lbl">{outcome.entry ? t('ganancia (entrada {n})', { n: outcome.entry.toLocaleString() }) : t('monedas')}</span>
          </div>
          <div className="reward grow">
            <span className="reward-lbl">{t('Nivel')} {xpLvl.level}</span>
            <div className="xpbar big">
              <motion.div className="xpbar-fill" initial={false} animate={{ width: `${(xpLvl.into / xpLvl.need) * 100}%` }} transition={{ duration: 1 }} />
            </div>
            <span className="reward-val small">+{outcome.xp} XP</span>
          </div>
          <div className="reward">
            <span className="reward-icon"><GemIcon size={28} /></span>
            <span className="reward-val">+{outcome.gems}</span>
            <span className="reward-lbl">{t('gemas')}</span>
          </div>
        </motion.div>
      ) : (
        <div ref={rewardsRef} className="rule-note">{me < 0 ? t('Partida entre máquinas: sin premios.') : config.mode === 'local' ? t('Partida local de varios jugadores: sin premios individuales.') : ''}</div>
      )}

      <div className="victory-actions">
        {!online || config.mode !== 'online' ? (
          <motion.button
            className="btn3d green shine"
            whileTap={{ scale: 0.93 }}
            onClick={async () => {
              if (!online) {
                rematch();
                return go('game');
              }
              // Partida contra la máquina en el servidor: la misma mesa otra vez (cobra la entrada).
              quit();
              const err = await useOnline.getState().rematchAi();
              if (err) {
                fx.toast({ icon: '⚠️', title: t(err) });
                go('lobby');
              }
            }}
          >
            🔁 {t('Revancha')}
          </motion.button>
        ) : (
          <motion.button className="btn3d green shine" whileTap={{ scale: 0.93 }} onClick={() => { quit(); go('online'); }}>
            🌐 {t('Otra online')}
          </motion.button>
        )}
        <motion.button className="btn3d ghost" whileTap={{ scale: 0.93 }} onClick={() => { quit(); go('lobby'); }}>
          🏠 {t('Menú')}
        </motion.button>
      </div>

      <AnimatePresence>
        {levelUp ? (
          <motion.div className="levelup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLevelUp(null)}>
            <motion.div className="levelup-card" initial={{ scale: 0.2, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
              <div className="lu-rays" />
              <span className="lu-star">⭐</span>
              <h2>{t('¡Subiste de nivel!')}</h2>
              <div className="lu-level">{levelUp}</div>
              <p>
                +{outcome?.levelCoins.toLocaleString()} <CoinIcon size={16} />
              </p>
              <small>{t('Toca para seguir')}</small>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span hidden>{lvl.level}</span>
    </div>
  );
}

/** Ganador: corona, trompetas a los lados y cinta "GANADOR" (dibujado en SVG). */
function WinnerShowcase({ avatar, name, color, frameId, label }: { avatar: string; name: string; color: string; frameId?: string; label: string }) {
  return (
    <div className="winner-show">
      <motion.svg className="trumpet left" viewBox="0 0 120 60" initial={{ x: -60, opacity: 0, rotate: -20 }} animate={{ x: 0, opacity: 1, rotate: [-14, -6, -14] }} transition={{ x: { delay: 0.3 }, opacity: { delay: 0.3 }, rotate: { duration: 1.2, repeat: Infinity } }}>
        <Trumpet flip />
      </motion.svg>
      <motion.svg className="trumpet right" viewBox="0 0 120 60" initial={{ x: 60, opacity: 0, rotate: 20 }} animate={{ x: 0, opacity: 1, rotate: [14, 6, 14] }} transition={{ x: { delay: 0.3 }, opacity: { delay: 0.3 }, rotate: { duration: 1.2, repeat: Infinity } }}>
        <Trumpet />
      </motion.svg>
      <motion.div className="winner-av" initial={{ scale: 0.2 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}>
        <motion.svg className="winner-crown" viewBox="0 0 120 70" animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <defs>
            <linearGradient id="crownG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff3a0" />
              <stop offset="55%" stopColor="#ffc928" />
              <stop offset="100%" stopColor="#d98a00" />
            </linearGradient>
          </defs>
          <path d="M10 62 L4 14 L34 36 L60 4 L86 36 L116 14 L110 62 Z" fill="url(#crownG)" stroke="#8a5300" strokeWidth={3} strokeLinejoin="round" />
          <rect x={10} y={54} width={100} height={10} rx={3} fill="#e0a400" stroke="#8a5300" strokeWidth={2} />
          {[4, 60, 116].map((x, i) => <circle key={i} cx={x} cy={i === 1 ? 4 : 14} r={6} fill="#fff8c4" stroke="#8a5300" strokeWidth={2} />)}
          <circle cx={60} cy={44} r={6} fill="#e11d48" stroke="#7a0b25" strokeWidth={1.5} />
          <circle cx={34} cy={47} r={4} fill="#22c55e" />
          <circle cx={86} cy={47} r={4} fill="#3b82f6" />
          <path d="M70 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#fff" />
        </motion.svg>
        <div className="winner-ring" style={{ ['--pc' as string]: color }}>
          <Avatar emoji={avatar} size={104} color={color} frameId={frameId} />
        </div>
      </motion.div>
      <motion.div className="ribbon" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 16 }}>
        <span className="ribbon-tail l" />
        <span className="ribbon-main">{label}</span>
        <span className="ribbon-tail r" />
      </motion.div>
      <div className="winner-name">{name}</div>
      <Mascot size={96} mood="gana" className="victory-mascot" />
    </div>
  );
}

function Trumpet({ flip = false }: { flip?: boolean }) {
  return (
    <g transform={flip ? 'scale(-1 1) translate(-120 0)' : undefined}>
      <defs>
        <linearGradient id="trG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff1a0" />
          <stop offset="50%" stopColor="#ffc928" />
          <stop offset="100%" stopColor="#c47f00" />
        </linearGradient>
      </defs>
      <rect x={4} y={26} width={64} height={8} rx={3} fill="url(#trG)" stroke="#8a5300" strokeWidth={1.5} />
      <path d="M66 24 L112 4 Q118 30 112 56 L66 36 Z" fill="url(#trG)" stroke="#8a5300" strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={112} cy={30} rx={5} ry={26} fill="#ffe27a" stroke="#8a5300" strokeWidth={2} />
      <rect x={22} y={18} width={6} height={10} rx={2} fill="#e0a400" />
      <rect x={34} y={18} width={6} height={10} rx={2} fill="#e0a400" />
      <rect x={46} y={18} width={6} height={10} rx={2} fill="#e0a400" />
      <path d="M40 34 L46 52 L52 34" fill="#e11d48" />
    </g>
  );
}

/** Medalla hexagonal con el puesto. */
function Medal({ n }: { n: number }) {
  const c = n === 2 ? ['#e2e8f0', '#94a3b8', '#475569'] : n === 3 ? ['#f0b27a', '#b5651d', '#6b3a10'] : ['#a78bfa', '#6d28d9', '#3b1a78'];
  return (
    <svg viewBox="0 0 60 60" className="medal">
      <polygon points="30,3 54,16 54,44 30,57 6,44 6,16" fill={c[1]} stroke={c[2]} strokeWidth={3} />
      <polygon points="30,10 48,20 48,40 30,50 12,40 12,20" fill={c[0]} />
      <text x={30} y={31} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={900} fontFamily="'Baloo 2', sans-serif" fill={c[2]}>
        {n}
      </text>
    </svg>
  );
}
