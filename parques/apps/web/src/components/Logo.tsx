import { tr } from '../lib/i18n';
import { motion } from 'framer-motion';

/** Logo de Parqués: el ícono (mini tablero clásico) + letras en los colores del juego. */
export function Logo({ size = 1 }: { size?: number }) {
  const letters = 'PARQUÉS'.split('');
  const colors = ['amarillo', 'rojo', 'verde', 'azul', 'amarillo', 'rojo', 'verde'];
  return (
    <div className="logo" style={{ fontSize: `${size}rem` }}>
      <motion.img
        src="icon.svg"
        alt=""
        className="logo-icon"
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: [0, -4, 4, 0], opacity: 1, y: [0, -6, 0] }}
        transition={{ scale: { type: 'spring', stiffness: 300, damping: 12 }, rotate: { duration: 4, repeat: Infinity }, y: { duration: 3, repeat: Infinity } }}
      />
      <span className="logo-big">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            style={{ color: `var(--${colors[i]})` }}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 500, damping: 14 }}
          >
            {l}
          </motion.span>
        ))}
      </span>
      <span className="logo-small">{tr('Colombiano')}</span>
    </div>
  );
}
