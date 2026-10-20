import { ListMusic, Music } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n';
import { cleanPlaylist, MUSIC_APPS, openMusicApp, openPlaylist } from '../lib/music';
import { actions, useStore } from '../store/store';
import { toast } from './feedback';
import { Sheet } from './ui';

const COLORS: Record<string, string> = { spotify: 'bg-[#1DB954] text-ink', apple: 'bg-gradient-to-br from-rose-500 to-pink-500 text-snow', youtube: 'bg-red-600 text-snow' };

// Music for the workout: the music apps, and the person's own playlist.
export const MusicButton = ({ className = '' }: { className?: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)} aria-label={t('music.open')} className={className || 'rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white'}><Music size={20} /></button>
            <MusicSheet open={open} onClose={() => setOpen(false)} />
        </>
    );
};

export const MusicSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const playlist = useStore(s => s.profile?.musicPlaylist ?? '');
    const [link, setLink] = useState(playlist);
    const save = () => {
        const url = cleanPlaylist(link);
        if (link.trim() && !url) {
            toast(t('music.badLink'), 3500);
            return;
        }
        actions.updateProfile({ musicPlaylist: url ?? undefined });
        if (url) toast(t('music.saved'));
    };
    return (
        <Sheet open={open} onClose={onClose} title={t('music.title')}>
            <p className="mb-4 text-sm text-white/60">{t('music.hint')}</p>
            {playlist && (
                <button onClick={() => void openPlaylist(playlist)} className="btn-primary mb-3 w-full"><ListMusic size={18} /> {t('music.playlist')}</button>
            )}
            <div className="mb-5 grid grid-cols-3 gap-2">
                {MUSIC_APPS.map(m => (
                    <button key={m.id} onClick={() => void openMusicApp(m)} className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-bold ${COLORS[m.id]}`}>
                        <Music size={22} /> {m.name}
                    </button>
                ))}
            </div>
            <label htmlFor="music-playlist" className="mb-1 block text-sm font-medium">{t('music.playlistLabel')}</label>
            <p className="mb-2 text-xs text-white/50">{t('music.playlistHint')}</p>
            <div className="flex gap-2">
                <input id="music-playlist" value={link} onChange={e => setLink(e.target.value)} inputMode="url" placeholder="https://open.spotify.com/playlist/…"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 text-sm outline-none focus:border-brand" />
                <button onClick={save} className="btn-ghost px-3 text-sm">{t('music.save')}</button>
            </div>
        </Sheet>
    );
};
