import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Modal({ open, onClose, children, className = '' }: { open: boolean; onClose?: () => void; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className={`modal card glossy ${className}`}
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {onClose ? (
              <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                ✕
              </button>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
