import React, { useEffect, useRef, useState } from 'react';
import { Texts } from './i18n';

interface Option {
  icon: string;
  label: string;
  on?: boolean; // undefined = acción (no interruptor)
  onClick: () => void;
}

const SettingsMenu: React.FC<{ text: Texts; options: Option[] }> = ({ text, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={text.settings}
        title={text.settings}
        className="flex items-center justify-center size-9 sm:size-10 rounded-full bg-black/40 text-yellow-200 hover:bg-black/60 ring-1 ring-yellow-200/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
      >
        <span className="material-symbols-outlined text-xl">settings</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl bg-zinc-900/95 backdrop-blur ring-1 ring-white/10 shadow-2xl p-2 text-sm text-zinc-100"
        >
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              role={o.on === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-checked={o.on}
              onClick={() => {
                o.onClick();
                if (o.on === undefined) setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-left"
            >
              <span className="material-symbols-outlined text-xl text-yellow-300">{o.icon}</span>
              <span className="flex-1 font-semibold">{o.label}</span>
              {o.on !== undefined && (
                <span className={`relative w-9 h-5 rounded-full transition-colors ${o.on ? 'bg-primary' : 'bg-zinc-600'}`}>
                  <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${o.on ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              )}
            </button>
          ))}
          <p className="hidden sm:block px-3 pt-2 pb-1 mt-1 border-t border-white/10 text-[11px] leading-snug text-zinc-400">{text.shortcuts}</p>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
