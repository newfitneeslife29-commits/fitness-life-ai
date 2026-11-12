import { motion } from 'framer-motion';

/** Dadito, la mascota de Parqués Colombia (arte en public/art/mascota.webp). */
export function Mascot({ size = 120, className = '', wave = true }: { size?: number; className?: string; wave?: boolean }) {
  return (
    <motion.img
      src="art/mascota.webp"
      alt=""
      draggable={false}
      className={`mascot ${className}`}
      style={{ width: size, height: 'auto' }}
      initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
      animate={wave ? { scale: 1, opacity: 1, rotate: [0, -4, 4, 0], y: [0, -6, 0] } : { scale: 1, opacity: 1, rotate: 0 }}
      transition={wave ? { scale: { type: 'spring', stiffness: 300, damping: 14 }, opacity: { duration: 0.3 }, rotate: { duration: 3, repeat: Infinity }, y: { duration: 2.2, repeat: Infinity } } : { type: 'spring', stiffness: 300, damping: 14 }}
    />
  );
}
