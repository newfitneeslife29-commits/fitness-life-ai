import { Capacitor } from '@capacitor/core';
import { locale } from '../i18n';
import { actions, useStore } from '../store/store';
import type { PremiumStatus } from '../store/types';
import { aiAvailable, getUserId } from './ai';

// Fitness Life Premium unlocks the AI nutrition coach. Two plans, priced in
// App Store Connect, Google Play Console and RevenueCat Web Billing: monthly
// (4.99 USD) and annual (39.99 USD). RevenueCat unifies the three stores
// behind one entitlement, `premium`. The app user id is the anonymous
// Supabase id, so the AI function can check the same subscription server-side.

export const ENTITLEMENT = 'premium';
export type PlanId = 'annual' | 'monthly';
// USD prices, shown until the store answers with the localized ones.
export const PRICES: Record<PlanId, number> = { annual: 39.99, monthly: 4.99 };
export const ANNUAL_SAVING = Math.round((1 - PRICES.annual / (PRICES.monthly * 12)) * 100); // %
// Fair-use ceiling per month; keep in sync with PREMIUM_MONTHLY_LIMIT in
// supabase/functions/nutrition-coach (the server is what enforces it).
// Free users get no AI.
export const PREMIUM_AI_USES = 300;

export const money = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat(locale(), { style: 'currency', currency }).format(amount);

type Platform = 'ios' | 'android' | 'web';
const platform = Capacitor.getPlatform() as Platform;

// Public SDK keys (safe to ship in the app; the secret key lives only in the server).
const KEYS: Record<Platform, string | undefined> = {
    ios: import.meta.env.VITE_RC_IOS_KEY,
    android: import.meta.env.VITE_RC_ANDROID_KEY,
    web: import.meta.env.VITE_RC_WEB_KEY,
};

// Terms and privacy policy (public/legal.html). Inside the native apps the
// page must open from the published site, since stores review that URL.
export const LEGAL_URL = import.meta.env.VITE_LEGAL_URL
    || (platform === 'web' ? './legal.html' : 'https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html');

export const premiumAvailable = () => aiAvailable() && Boolean(KEYS[platform]);

// Premium according to the store (RevenueCat) or to the AI server.
export const usePremiumActive = () => useStore(s => Boolean(s.premium?.active || s.aiUsage?.premium));

export interface Plan {
    id: PlanId;
    price: string;
    perMonth: string; // annual plan: what it comes to per month
    buy: () => Promise<boolean>; // false: the user cancelled
}

// Plans the store offers, annual first.
export type Offer = Plan[];

export const fallbackPlan = (id: PlanId): Omit<Plan, 'buy'> =>
    ({ id, price: money(PRICES[id]), perMonth: money(PRICES[id] / (id === 'annual' ? 12 : 1)) });

interface Backend {
    offer(): Promise<Offer>;
    status(): Promise<PremiumStatus>;
    restore(): Promise<PremiumStatus>;
}

interface EntitlementLike {
    expirationDate: string | Date | null;
    willRenew: boolean;
}

const toStatus = (active: Record<string, EntitlementLike>, manageUrl: string | null): PremiumStatus => {
    const e = active[ENTITLEMENT];
    const expires = e?.expirationDate ?? null;
    return {
        active: Boolean(e),
        expiresAt: expires === null ? null : new Date(expires).toISOString(),
        willRenew: e?.willRenew ?? false,
        manageUrl,
        checkedAt: new Date().toISOString(),
    };
};

// iOS and Android: App Store / Google Play through the Capacitor plugin.
const nativeBackend = async (userId: string): Promise<Backend> => {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.configure({ apiKey: KEYS[platform]!, appUserID: userId });
    const status = async () => {
        const { customerInfo } = await Purchases.getCustomerInfo();
        return toStatus(customerInfo.entitlements.active, customerInfo.managementURL);
    };
    return {
        status,
        async restore() {
            const { customerInfo } = await Purchases.restorePurchases();
            return toStatus(customerInfo.entitlements.active, customerInfo.managementURL);
        },
        async offer() {
            const offering = (await Purchases.getOfferings()).current;
            const plans: Plan[] = [];
            for (const id of ['annual', 'monthly'] as const) {
                const pkg = offering?.[id];
                if (!pkg) continue;
                const { price, priceString, currencyCode } = pkg.product;
                plans.push({
                    id,
                    price: priceString,
                    perMonth: id === 'annual' ? money(price / 12, currencyCode) : priceString,
                    async buy() {
                        try {
                            const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
                            actions.setPremium(toStatus(customerInfo.entitlements.active, customerInfo.managementURL));
                            return true;
                        } catch (e) {
                            if ((e as { userCancelled?: boolean | null }).userCancelled) return false;
                            throw e;
                        }
                    },
                });
            }
            return plans;
        },
    };
};

// Web: RevenueCat Web Billing (card payments through Stripe).
const webBackend = async (userId: string): Promise<Backend> => {
    const { Purchases, PurchasesError, ErrorCode } = await import('@revenuecat/purchases-js');
    const purchases = Purchases.isConfigured()
        ? Purchases.getSharedInstance()
        : Purchases.configure({ apiKey: KEYS.web!, appUserId: userId });
    const status = async () => {
        const info = await purchases.getCustomerInfo();
        return toStatus(info.entitlements.active, info.managementURL);
    };
    return {
        status,
        restore: status, // web purchases are tied to this account already
        async offer() {
            const offering = (await purchases.getOfferings()).current;
            const plans: Plan[] = [];
            for (const id of ['annual', 'monthly'] as const) {
                const pkg = offering?.[id];
                const price = pkg?.webBillingProduct.price;
                if (!pkg || !price) continue;
                const amount = price.amountMicros / 1_000_000;
                plans.push({
                    id,
                    price: money(amount, price.currency),
                    perMonth: money(id === 'annual' ? amount / 12 : amount, price.currency),
                    async buy() {
                        try {
                            const { customerInfo } = await purchases.purchase({ rcPackage: pkg });
                            actions.setPremium(toStatus(customerInfo.entitlements.active, customerInfo.managementURL));
                            return true;
                        } catch (e) {
                            if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) return false;
                            throw e;
                        }
                    },
                });
            }
            return plans;
        },
    };
};

let backend: Promise<Backend> | null = null;
const getBackend = () => {
    if (!premiumAvailable()) return Promise.reject(new Error('premium unavailable'));
    backend ??= getUserId().then(id => (platform === 'web' ? webBackend(id) : nativeBackend(id)));
    return backend.catch(e => {
        backend = null;
        throw e;
    });
};

export const getOffer = async () => (await getBackend()).offer();

// Updates the cached status shown in the UI.
export const refreshPremium = async () => {
    const status = await (await getBackend()).status();
    actions.setPremium(status);
    return status;
};

export const restorePremium = async () => {
    const status = await (await getBackend()).restore();
    actions.setPremium(status);
    return status;
};
