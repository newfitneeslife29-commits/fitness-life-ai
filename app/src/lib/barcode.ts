import type { Food } from '../data/foods';
import { getLang, t } from '../i18n';
import { isNative } from './native';

// Packaged foods by their barcode: the phone's camera reads it and Open Food
// Facts (a free, open database) gives the nutrition per 100 g.

export type BarcodeResult = { food: Food; brand: string } | 'notFound' | 'noNutrition';

export const validBarcode = (code: string) => /^\d{8,14}$/.test(code);

const SERVING = { es: '1 porción', en: '1 serving', pt: '1 porção', fr: '1 portion', de: '1 Portion', it: '1 porzione', nl: '1 portie', pl: '1 porcja', tr: '1 porsiyon', ru: '1 порция', ja: '1食分', ko: '1인분', zh: '1 份', hi: '1 सर्विंग', id: '1 porsi' };

type Product = {
    product_name?: string; generic_name?: string; brands?: string; serving_quantity?: number | string; serving_quantity_unit?: string;
    nutriments?: Record<string, number | string | undefined>;
    [name: `product_name_${string}`]: string | undefined;
};

const num = (v: unknown) => {
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

// Open Food Facts' answer as a food of the table (per 100 g, a serving).
export const productToFood = (code: string, p: Product, lang = getLang()): BarcodeResult => {
    const name = (p[`product_name_${lang}`] || p.product_name || p.product_name_en || p.generic_name || '').trim();
    if (!name) return 'notFound';
    const n = p.nutriments ?? {};
    const kcal = num(n['energy-kcal_100g']) ?? (num(n.energy_100g) !== null ? num(n.energy_100g)! / 4.184 : null);
    if (kcal === null) return 'noNutrition';
    const serving = num(p.serving_quantity);
    const grams = serving && serving >= 5 && serving <= 1000 && (!p.serving_quantity_unit || p.serving_quantity_unit === 'g' || p.serving_quantity_unit === 'ml') ? Math.round(serving) : 100;
    const label = grams === 100 && !serving ? { es: '100 g', en: '100 g', pt: '100 g' } : SERVING;
    return {
        brand: (p.brands ?? '').split(',')[0].trim(),
        food: {
            id: `barcode:${code}`, category: 'other',
            name: { es: name, en: name, pt: name },
            per100: {
                kcal: Math.round(kcal), protein: round1(num(n.proteins_100g) ?? 0), carbs: round1(num(n.carbohydrates_100g) ?? 0),
                fat: round1(num(n.fat_100g) ?? 0), fiber: round1(num(n.fiber_100g) ?? 0),
            },
            portion: { grams, label },
        },
    };
};

export const lookupBarcode = async (code: string): Promise<BarcodeResult> => {
    const lang = getLang();
    const fields = ['product_name', `product_name_${lang}`, 'product_name_en', 'generic_name', 'brands', 'serving_quantity', 'serving_quantity_unit', 'nutriments'].join(',');
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`);
    if (res.status === 404) return 'notFound';
    if (!res.ok) throw new Error(`Open Food Facts: HTTP ${res.status}`);
    const data = await res.json() as { status?: number; product?: Product };
    return data.status === 1 && data.product ? productToFood(code, data.product, lang) : 'notFound';
};

// The camera, in the phone apps (the web types the number): null when
// nothing readable was scanned; throws when there's no camera to use.
export const scanBarcode = async (): Promise<string | null> => {
    if (!isNative()) throw new Error('no camera on the web');
    const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import('@capacitor/barcode-scanner');
    const { ScanResult } = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.ALL, scanInstructions: t('barcode.instructions'), cancelButtonAccessibilityLabel: t('common.cancel'),
    });
    const code = (ScanResult ?? '').trim();
    return validBarcode(code) ? code : null;
};
