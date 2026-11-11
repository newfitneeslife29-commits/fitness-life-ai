import { AnimatePresence, motion } from 'framer-motion';
import type { Banner as BannerT } from '../stores/gameStore';

/** Carteles grandes: tres pares (dramático), soplo, capturas, coronaciones. */
export function Banner({ banner }: { banner: BannerT | null }) {
  return (
    <AnimatePresence>
      {banner ? (
        <motion.div
          key={banner.id}
          className={`banner banner-${banner.kind}`}
          initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: banner.kind === 'triple' ? [0, -3, 3, -2, 0] : 0 }}
          exit={{ scale: 1.3, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
        >
          <div className="banner-title">{banner.title}</div>
          {banner.sub ? <div className="banner-sub">{banner.sub}</div> : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
