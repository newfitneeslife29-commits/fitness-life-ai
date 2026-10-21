import { ChevronRight, ShoppingBag } from 'lucide-react';
import { t } from '../i18n';
import { openShop } from '../lib/shop';

// The clothing store, on the home screen.
export const ShopCard = () => (
    <button onClick={() => void openShop()} className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f1722] to-[#1d2b3d] p-4 text-left text-snow shadow-lg shadow-black/20 active:scale-[0.99]">
        <span aria-hidden className="absolute -right-6 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-brand/30 blur-2xl" />
        <img src="./shop/tee.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-4 right-8 h-20 rotate-3 drop-shadow-xl" />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-snow"><ShoppingBag size={22} /></span>
        <span className="relative min-w-0 flex-1 pr-16">
            <span className="block font-bold">{t('shop.title')}</span>
            <span className="block text-sm text-snow/80">{t('shop.hint')}</span>
        </span>
        <ChevronRight className="relative shrink-0" />
    </button>
);
