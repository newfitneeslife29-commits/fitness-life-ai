import { motion } from 'framer-motion';

/**
 * Dadito, la mascota de Parqués Colombia.
 * `mood`: 'hola' saluda y rebota, 'gana' celebra con confeti (WebP animados en public/art), 'quieto' = ilustración fija.
 */
export function Mascot({ size = 120, className = '', mood = 'hola' }: { size?: number; className?: string; mood?: 'hola' | 'gana' | 'quieto' }) {
  const src = mood === 'quieto' ? 'art/mascota.webp' : `art/dadito-${mood}.webp`;
  return (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      className={`mascot ${className}`}
      style={{ width: size, height: 'auto' }}
      initial={{ scale: 0.4, opacity: 0, rotate: -12, y: 30 }}
      animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 13 }}
    />
  );
}
