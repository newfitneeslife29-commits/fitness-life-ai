import { describe, expect, it } from 'vitest';
import { contactLink, trainerLanguages } from './trainers';

describe('trainer languages', () => {
    it('read saved codes with their flag and name', () => {
        expect(trainerLanguages('es,en')).toEqual([
            { code: 'es', flag: '🇪🇸', label: 'Español' },
            { code: 'en', flag: '🇺🇸', label: 'English' },
        ]);
    });

    it('read older free-text answers as best they can', () => {
        expect(trainerLanguages('Español / inglés, Catalan').map(l => l.label)).toEqual(['Español', 'inglés', 'Catalan']);
        expect(trainerLanguages('English')[0].code).toBe('en');
        expect(trainerLanguages('')).toEqual([]);
    });
});

describe('trainer contact', () => {
    it('turns a phone into WhatsApp and a handle into Instagram', () => {
        expect(contactLink('+34 600 111 222')).toBe('https://wa.me/34600111222');
        expect(contactLink('@ana.fit')).toBe('https://instagram.com/ana.fit');
    });
});
