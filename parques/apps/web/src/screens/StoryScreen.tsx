import { motion } from 'framer-motion';
import { STORY, item } from '@parques/engine';
import { TopBar } from '../components/TopBar';
import { Avatar } from '../components/Avatar';
import { CoinIcon, GemIcon } from '../components/Counter';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { useOnline } from '../lib/online';
import { useT } from '../lib/i18n';
import { play } from '../audio/audio';

/** Modo Historia: recorre Colombia venciendo a un rival de cada región y desbloquea su tablero y su avatar. */
export function StoryScreen() {
  const t = useT();
  const p = useProfile();
  const fx = useFx();

  const playStage = async (i: number) => {
    play('tap');
    if (p.coins < 200) return fx.toast({ icon: '🪙', title: t('Te faltan monedas') });
    const err = await useOnline.getState().playAi({ table: 'barrio', players: STORY[i]!.players, story: i });
    if (err) fx.toast({ icon: '⚠️', title: t(err) });
  };

  return (
    <div className="screen story-screen">
      <TopBar back title={t('Historia de Colombia')} />
      <p className="rule-note strong">{t('Vence al campeón de cada región y gánate su tablero, su avatar y premios. Entrada: 200 monedas.')}</p>
      <div className="story-path">
        {STORY.map((st, i) => {
          const done = i < p.story;
          const current = i === p.story;
          const locked = i > p.story;
          return (
            <motion.div
              key={st.id}
              className={`story-stage ${done ? 'done' : ''} ${current ? 'current' : ''} ${locked ? 'locked' : ''}`}
              initial={{ x: i % 2 ? 40 : -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
            >
              <span className="story-node">{done ? '✅' : locked ? '🔒' : st.emoji}</span>
              <div className="story-card card glossy">
                <div className="story-head">
                  <Avatar emoji={st.bossAvatar} size={46} />
                  <div>
                    <b>{t(st.region)}</b>
                    <small>
                      {t(st.boss)} · {st.players === 2 ? t('1 vs 1') : t('4 jugadores')} · {t(st.level === 'easy' ? 'Fácil' : st.level === 'normal' ? 'Normal' : 'Experto')}
                    </small>
                  </div>
                </div>
                {current ? <p className="story-intro">“{t(st.intro)}”</p> : null}
                <div className="story-reward">
                  <span>
                    <CoinIcon size={14} /> {st.reward.coins.toLocaleString()} · <GemIcon size={14} /> {st.reward.gems}
                  </span>
                  <span className="story-items">{st.reward.itemIds.map((id) => item(id).emoji).join(' ')}</span>
                </div>
                {current ? (
                  <motion.button className="btn3d play-btn wide shine" whileTap={{ scale: 0.94 }} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.3, repeat: Infinity }} onClick={() => void playStage(i)}>
                    ⚔️ {t('¡A la batalla!')}
                  </motion.button>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>
      {p.story >= STORY.length ? <p className="rule-note strong">🏆 {t('¡Conquistaste toda Colombia! Eres una leyenda del Parqués.')}</p> : null}
    </div>
  );
}
