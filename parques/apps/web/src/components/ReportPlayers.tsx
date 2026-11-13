import { useState } from 'react';
import { useOnline } from '../lib/online';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { useT } from '../lib/i18n';

const REASONS = ['groserías', 'trampa', 'abandono', 'nombre ofensivo'];

/** En el menú de una partida online: reportar o bloquear a otro jugador de la mesa. */
export function ReportPlayers() {
  const t = useT();
  const fx = useFx();
  const room = useOnline((o) => o.room);
  const call = useOnline((o) => o.call);
  const me = useProfile((p) => p.id);
  const blocked = useProfile((p) => p.blocked);
  const block = useProfile((p) => p.block);
  const [open, setOpen] = useState<string | null>(null);
  const others = (room?.seats ?? []).filter((s) => s.playerId && s.playerId !== me && s.kind !== 'bot');
  if (!others.length) return null;

  const report = async (id: string, reason: string) => {
    const r = await call<{ ok: boolean; error?: string }>('report', { playerId: id, reason });
    setOpen(null);
    fx.toast({ icon: r?.ok ? '🛡️' : '⚠️', title: t(r?.ok ? 'Reporte enviado. ¡Gracias por cuidar la comunidad!' : (r?.error ?? 'Error')) });
  };

  return (
    <div className="report-players">
      <small>🚩 {t('Reportar o bloquear')}</small>
      {others.map((s) => (
        <div key={s.playerId} className="rp-row">
          <span>{s.name}</span>
          {open === s.playerId ? (
            <span className="rp-reasons">
              {REASONS.map((r) => (
                <button key={r} className="chip-btn" onClick={() => void report(s.playerId!, r)}>
                  {t(r)}
                </button>
              ))}
            </span>
          ) : (
            <>
              <button className="chip-btn" onClick={() => setOpen(s.playerId)}>
                🚩 {t('Reportar')}
              </button>
              <button
                className="chip-btn"
                disabled={blocked.includes(s.playerId!)}
                onClick={async () => {
                  await block(s.playerId!);
                  fx.toast({ icon: '🚫', title: t('Jugador bloqueado'), sub: t('Ya no verás sus mensajes') });
                }}
              >
                🚫 {blocked.includes(s.playerId!) ? t('Bloqueado') : t('Bloquear')}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
