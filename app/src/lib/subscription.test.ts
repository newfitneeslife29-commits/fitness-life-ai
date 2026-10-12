import { describe, expect, it } from 'vitest';
import { hasEntitlement } from '../../../supabase/functions/nutrition-coach/subscription';
import { trialDaysOf } from './premium';

// Server-side Premium check against RevenueCat's subscriber payload.
describe('hasEntitlement', () => {
    const now = Date.parse('2026-10-08T12:00:00Z');
    const body = (expires: string | null) => ({ subscriber: { entitlements: { premium: { expires_date: expires, product_identifier: 'premium_monthly' } } } });

    it('is active until the expiry date', () => {
        expect(hasEntitlement(body('2026-11-08T12:00:00Z'), 'premium', now)).toBe(true);
        expect(hasEntitlement(body('2026-10-01T12:00:00Z'), 'premium', now)).toBe(false);
    });

    it('treats a missing expiry as lifetime access', () => {
        expect(hasEntitlement(body(null), 'premium', now)).toBe(true);
    });

    it('is false without the entitlement or with an unexpected payload', () => {
        expect(hasEntitlement({ subscriber: { entitlements: {} } }, 'premium', now)).toBe(false);
        expect(hasEntitlement(body('2026-11-08T12:00:00Z'), 'pro', now)).toBe(false);
        expect(hasEntitlement(null, 'premium', now)).toBe(false);
        expect(hasEntitlement('nope', 'premium', now)).toBe(false);
    });
});

describe('trialDaysOf', () => {
    it('reads the free phase Google Play offers this user', () => {
        expect(trialDaysOf({ identifier: 'premium:mensual', defaultOption: { freePhase: { billingPeriod: { unit: 'DAY', value: 7 } } } })).toBe(7);
        expect(trialDaysOf({ identifier: 'anual:anual', defaultOption: { freePhase: { billingPeriod: { unit: 'WEEK', value: 2 } } } })).toBe(14);
        expect(trialDaysOf({ identifier: 'premium:mensual', defaultOption: { freePhase: null } })).toBeUndefined();
    });
    it('uses a free App Store intro offer only when the user is eligible', () => {
        const product = { identifier: 'x', introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 } };
        expect(trialDaysOf(product, true)).toBe(7);
        expect(trialDaysOf(product, false)).toBeUndefined();
        expect(trialDaysOf({ identifier: 'x', introPrice: { price: 0.99, periodUnit: 'MONTH', periodNumberOfUnits: 1, cycles: 1 } })).toBeUndefined();
    });
});
