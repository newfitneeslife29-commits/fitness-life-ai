import { ArrowRight, ShoppingBag } from 'lucide-react';
import { t } from '../i18n';
import { openShop, SHOP_CODE } from '../lib/shop';

// The clothing store on the home screen: a brand photo with the app users' discount.
export const ShopCard = () => (
    <button onClick={() => void openShop()} className="relative block w-full overflow-hidden rounded-3xl bg-[#0f1722] text-left text-snow shadow-xl shadow-black/25 active:scale-[0.99]">
        <img src="./shop/look.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0b121b]/95 via-[#0b121b]/70 to-transparent" />
        <span aria-hidden className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand/30 blur-3xl" />
        <span className="relative flex min-h-[13rem] flex-col justify-between gap-4 p-5 pr-[38%]">
            <span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-snow shadow-md shadow-brand/40">
                    {t('shop.offer', { code: SHOP_CODE })}
                </span>
                <span className="mt-3 block text-[1.6rem] font-extrabold uppercase leading-[1.05] tracking-tight">{t('shop.title')}</span>
                <span className="mt-1.5 block text-sm text-snow/80">{t('shop.hint')}</span>
            </span>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-snow px-4 py-2 text-sm font-bold text-[#0f1722]">
                <ShoppingBag size={16} /> {t('shop.cta')} <ArrowRight size={16} />
            </span>
        </span>
    </button>
);
