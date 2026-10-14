import { describe, expect, it } from 'vitest';
import { waterTargetMl } from './nutrition';

describe('water target', () => {
    it('is 35 ml per kg in whole glasses, more on training, very active days and high-protein diets', () => {
        expect(waterTargetMl({}, 80, { trained: false })).toBe(3000); // 2800 ml → 12 glasses
        expect(waterTargetMl({}, 80, { trained: true })).toBe(3500);
        expect(waterTargetMl({ activity: 'alto' }, 80, { trained: true, proteinG: 160 })).toBe(4000); // 2800 + 500 + 250 + 250 = 3800
        expect(waterTargetMl({}, 80, { trained: false, proteinG: 120 })).toBe(3000); // 1.5 g/kg: no extra
    });
    it('uses a general amount without a body weight', () => {
        expect(waterTargetMl({ sex: 'mujer' }, null, { trained: false })).toBe(2000);
        expect(waterTargetMl({}, null, { trained: false })).toBe(2500);
    });
});
