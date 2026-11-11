import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Confetti } from '../components/Confetti';
import { Avatar } from '../components/Avatar';
import { Background } from '../components/Background';
import { CoinIcon, CurrencyPill, GemIcon } from '../components/Counter';
import { humanSeat, useGame } from '../stores/gameStore';
import { useApp } from '../stores/appStore';
import { useLevel, useProfile } from '../stores/profileStore';
import { centerOf, useFx } from '../stores/fxStore';
import { levelFromXp } from '../meta/economy';
import { play } from '../audio/audio';
import { useT } from '../lib/i18n';

export function VictoryScreen() {
  const { game, config, rematch, quit, finishMatch, outcome, online } = useGame();
  const go = useApp((a) => a.go);
  const profile = useProfile();
  const lvl = useLevel();
  const fx = useFx();
  const t = useT();
  const rewardsRef = useRef<HTMLDivElement>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [xpShown, setXpShown] = useState<number | null>(null);

  useEffect(() => {
    if (!game || !config) return;
    const before = profile.xp;
    const res = outcome ?? finishMatch();
    const me = game.players.findIndex((_, i) => humanSeat(config, game, i));
    const won = me >= 0 && (game.rules.teams ? game.players[game.ranking[0]!]!.team === game.players[me]!.team : game.ranking[0] === me);
    play(won || me < 0 ? 'win' : 'lose');
    if (!res || outcome) return;
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
      }, 1300),
    );
    if (res.levelAfter > res.levelBefore) {
      timers.push(
        setTimeout(() => {
          setLevelUp(res.levelAfter);
          play('levelup');
        }, 2600),
      );
    }
    if (res.gems) timers.push(setTimeout(() => { fx.fly('gem', centerOf(rewardsRef.current), 5); fx.toast({ icon: '💎', title: t('+{n} gemas por ganar', { n: res.gems }) }); }, 1700));
    res.achievements.slice(0, 4).forEach((a, i) => timers.push(setTimeout(() => fx.toast({ icon: a.badge, title: t('¡Logro desbloqueado!'), sub: `${t(a.name.replace(/ [IVXL]+$/, ''))} ${a.name.match(/[IVXL]+$/)?.[0] ?? ''} · +${a.coins} 🪙` }), 2200 + i * 900)));
    if (res.achievements.length > 4) timers.push(setTimeout(() => fx.toast({ icon: '🏅', title: t('+{n} logros más', { n: res.achievements.length - 4 }) }), 6000));
    res.missions.forEach((m, i) => timers.push(setTimeout(() => fx.toast({ icon: '🎯', title: t('Misión completada'), sub: `${t(m.text)} · ${t('reclámala en Eventos')}` }), 3200 + i * 900)));
    if (res.passTiersGained > 0) timers.push(setTimeout(() => fx.toast({ icon: '🎟️', title: t('¡Subiste {n} nivel(es) en el pase!', { n: res.passTiersGained }) }), 4200));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!game || !config) return null;

  const ranking = game.ranking;
  const podium = [ranking[1], ranking[0], ranking[2]].filter((x): x is number => x !== undefined);
  const heights = { 0: 150, 1: 110, 2: 80 } as Record<number, number>;
  const me = game.players.findIndex((_, i) => humanSeat(config, game, i));
  const myPlace = me >= 0 ? ranking.indexOf(me) : -1;
  const won = game.rules.teams && me >= 0 ? game.players[ranking[0]!]!.team === game.players[me]!.team : myPlace === 0;
  const avatar = (i: number) => config.seats.find((s) => s.side === game.players[i]!.side)!.avatar;
  const xpLvl = levelFromXp(xpShown ?? profile.xp);

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

      <div className="podium">
        {podium.map((i) => {
          const place = ranking.indexOf(i);
          const p = game.players[i]!;
          return (
            <motion.div key={i} className="podium-col" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + (2 - place) * 0.25 }}>
              {place === 0 ? (
                <motion.div className="podium-crown" animate={{ y: [0, -6, 0], rotate: [-8, 8, -8] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  👑
                </motion.div>
              ) : null}
              <Avatar emoji={avatar(i)} size={place === 0 ? 72 : 60} color={`var(--${p.color})`} frameId={i === me ? profile.equipped.frame : undefined} />
              <div className="podium-name">{p.name}</div>
              <div className="podium-block" style={{ height: heights[place], ['--pc' as string]: `var(--${p.color})` }}>
                {place + 1}º
              </div>
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

      <div className="results card glossy">
        {ranking.map((i, k) => {
          const p = game.players[i]!;
          return (
            <div key={i} className={`result-line ${i === me ? 'me' : ''}`} style={{ ['--pc' as string]: `var(--${p.color})` }}>
              <span className="result-place">{k + 1}º</span>
              <span className="seat-swatch" />
              <span className="result-name">{p.name}</span>
              <span className="result-stat">💥 {p.stats.captures}</span>
              <span className="result-stat">🌬️ {p.stats.soplosHechos}</span>
              <span className="result-stat">🎲 {p.stats.pairs}</span>
            </div>
          );
        })}
      </div>

      <div className="victory-actions">
        {!online ? (
          <motion.button
            className="btn3d green shine"
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              if (config.table) return go('tables');
              rematch();
              go('game');
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
