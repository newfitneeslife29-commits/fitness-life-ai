import { describe, expect, it } from 'vitest';
import { hi } from '../i18n/hi';
import { ja } from '../i18n/ja';
import { ko } from '../i18n/ko';
import { ru } from '../i18n/ru';
import { zh } from '../i18n/zh';

// Languages with their own alphabet: a sentence in Latin letters there is a
// text pasted from another language (148 Russian texts were in Indonesian).
// The owner-only admin screens stay in English on purpose.
const SCRIPTS = { ru: [ru, /[а-яё]/i], hi: [hi, /[ऀ-ॿ]/], ja: [ja, /[぀-ヿ一-鿿]/], ko: [ko, /[가-힯]/], zh: [zh, /[一-鿿]/] } as const;
const sentence = /[A-Za-z]{4,} [A-Za-z]{3,} [A-Za-z]{3,}/;

describe('translations use their own alphabet', () => {
    for (const [lang, [dict, script]] of Object.entries(SCRIPTS)) {
        it(lang, () => {
            const foreign = Object.entries(dict).filter(([key, text]) => !key.startsWith('admin.') && sentence.test(text) && !script.test(text)).map(([key]) => key);
            expect(foreign).toEqual([]);
        });
    }
});
