import { tr } from '../lib/i18n';
import { motion } from 'framer-motion';

/** Contador de pares seguidos: crea tensión al llegar al segundo par. */
export function PairCounter({ streak, penalty }: { streak: number; penalty: boolean }) {
  const danger = penalty && streak >= 2;
  return (
    <motion.div
      className={`pair-counter ${danger ? 'danger' : ''}`}
      animate={danger ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={danger ? { duration: 0.6, repeat: Infinity } : undefined}
      title={tr('Pares seguidos')}
    >
      <span className="pc-label">{tr('Pares')}</span>
      <span className="pc-dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`pc-dot ${i < streak ? 'on' : ''} ${i === 2 ? 'last' : ''}`} />
        ))}
      </span>
    </motion.div>
  );
}
