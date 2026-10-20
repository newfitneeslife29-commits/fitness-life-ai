import { describe, expect, it } from 'vitest';
import { loadLang, setLang } from '../i18n';
import { commandWords, matchCommand } from './voiceCommands';

describe('hands-free commands', () => {
    it('hears the words in Spanish, accents or not', async () => {
        await loadLang('es');
        setLang('es');
        const w = commandWords();
        expect(matchCommand('Listo', w)).toBe('done');
        expect(matchCommand('vale ya está', w)).toBe('done');
        expect(matchCommand('siguiente', w)).toBe('next');
        expect(matchCommand('Mas tiempo por favor', w)).toBe('more');
        expect(matchCommand('20 segundos', w)).toBe('more');
        expect(matchCommand('guardar', w)).toBe('save');
        // Whole words only, and the last one said wins.
        expect(matchCommand('listón', w)).toBeNull();
        expect(matchCommand('listo, siguiente', w)).toBe('next');
        expect(matchCommand('hola qué tal', w)).toBeNull();
    });

    it('works in English and in languages without spaces', async () => {
        await loadLang('en');
        setLang('en');
        expect(matchCommand('OK, done!', commandWords())).toBe('done');
        expect(matchCommand('skip it', commandWords())).toBe('next');
        await loadLang('ja');
        setLang('ja');
        expect(matchCommand('次に行きます', commandWords())).toBe('next');
        await loadLang('es');
        setLang('es');
    });
});
