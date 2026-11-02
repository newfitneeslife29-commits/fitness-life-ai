import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Botón rectangular color crema, como los de la pantalla táctil de las máquinas. */
const MachineButton: React.FC<Props> = ({ className = '', style, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`relative flex items-center justify-center gap-[0.5em] px-[0.6em] uppercase font-bold leading-none text-[#14143a] rounded-[3px] transition-[filter,transform] duration-75 enabled:active:translate-y-[2px] enabled:active:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 ${className}`}
    style={{
      fontSize: 'clamp(11px, 1.5cqw, 17px)',
      height: 'clamp(40px, 4.6cqw, 52px)',
      background: 'linear-gradient(180deg, #fbf8c9 0%, #efe9a3 55%, #dcd47e 100%)',
      boxShadow: 'inset 0 1px 0 #fff, inset 0 -2px 0 rgba(0,0,0,.18), 0 2px 0 #000',
      WebkitTapHighlightColor: 'transparent',
      ...style,
    }}
    >
    {children}
  </button>
);

export default MachineButton;
