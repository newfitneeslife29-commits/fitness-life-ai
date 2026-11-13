import { motion } from 'framer-motion';

/**
 * Logo de Parqués Colombia (ilustración en public/art/logo.webp):
 * entra rebotando, flota suavemente y un brillo lo recorre de vez en cuando.
 * `size` = 1 → 300 px de ancho (máximo 88 % de la pantalla).
 */
export function Logo({ size = 1 }: { size?: number }) {
  return (
    <motion.div
      className="logo-art"
      style={{ width: `min(${Math.round(300 * size)}px, 88vw)` }}
      initial={{ scale: 0.3, rotate: -10, opacity: 0, y: -40 }}
      animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 13, mass: 0.9 }}
    >
      <motion.div
        className="logo-float"
        animate={{ y: [0, -7, 0], rotate: [0, -1.2, 1.2, 0] }}
        transition={{ y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' } }}
      >
        <img src="art/logo.webp" alt="Parqués Colombia" draggable={false} />
        <span className="logo-shine" aria-hidden style={{ ['--logo-mask' as string]: 'url(art/logo.webp)' }} />
        <motion.span
          className="logo-spark s1"
          aria-hidden
          animate={{ scale: [0, 1.2, 0], rotate: [0, 90, 180], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, delay: 0.8 }}
        />
        <motion.span
          className="logo-spark s2"
          aria-hidden
          animate={{ scale: [0, 1, 0], rotate: [0, -90, -180], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.8, delay: 2 }}
        />
      </motion.div>
    </motion.div>
  );
}
