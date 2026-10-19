import { describe, expect, it } from 'vitest';
import { hireState } from './trainerPay';
import { contactLink, displayPrice, formatMoney, trainerLanguages, trainerShareCents } from './trainers';

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

describe('trainer prices', () => {
    it('show the monthly price set by the team, or the older free text', () => {
        expect(formatMoney(4900, 'usd')).toMatch(/49/);
        expect(formatMoney(4950, 'eur')).toMatch(/49[.,]50/);
        expect(displayPrice({ priceCents: 4900, currency: 'usd', appPrice: '' })).toMatch(/49.*\/(mes|month)$/);
        expect(displayPrice({ priceCents: 0, currency: 'usd', appPrice: '40 $/mes' })).toBe('40 $/mes');
    });

    it("split each payment between the trainer and Fitness Life", () => {
        expect(trainerShareCents(4900, 25)).toBe(3675);
        expect(trainerShareCents(4900, 0)).toBe(4900);
        expect(trainerShareCents(999, 33)).toBe(669);
    });
});

describe('hire state', () => {
    it("groups Stripe's subscription statuses", () => {
        expect(hireState({ status: 'active' })).toBe('active');
        expect(hireState({ status: 'trialing' })).toBe('active');
        expect(hireState({ status: 'past_due' })).toBe('pastDue');
        expect(hireState({ status: 'unpaid' })).toBe('pastDue');
        expect(hireState({ status: 'canceled' })).toBe('ended');
        expect(hireState({ status: 'incomplete_expired' })).toBe('ended');
    });
});
