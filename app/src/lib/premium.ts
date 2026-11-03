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
// A known expiry date that has passed means it lapsed (until the next check).
export const usePremiumActive = () => useStore(s => {
    const store = !!s.premium?.active && (!s.premium.expiresAt || Date.parse(s.premium.expiresAt) > Date.now());
    return store || Boolean(s.aiUsage?.premium);
});

export interface Plan {
    id: PlanId;
    price: string;
    perMonth: string; // annual plan: what it comes to per month
    buy: () => Promise<boolean>; // false: the user cancelled
    // Free trial this user can get. The store takes the payment method first
    // and charges nothing until the trial ends.
    trialDays?: number;
}

// Plans the store offers, annual first.
export type Offer = Plan[];

// Plan selected when the Premium page opens: one with a free trial, so
// people see it straight away; otherwise the annual plan, or what the store has.
export const firstPlan = (offer: Pick<Plan, 'id' | 'trialDays'>[]): PlanId | null =>
    offer.find(p => p.trialDays)?.id ?? (offer.some(p => p.id === 'annual') ? 'annual' : offer[0]?.id ?? null);

export const fallbackPlan = (id: PlanId): Omit<Plan, 'buy'> =>
    ({ id, price: money(PRICES[id]), perMonth: money(PRICES[id] / (id === 'annual' ? 12 : 1)) });

interface Backend {
    offer(): Promise<Offer>;
    status(): Promise<PremiumStatus>;
    restore(): Promise<PremiumStatus>;
    switchUser(id: string): Promise<void>;
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

const DAYS_PER: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

interface TrialProduct {
    identifier: string;
    defaultOption?: { freePhase: { billingPeriod: { unit: string; value: number } } | null } | null;
    introPrice?: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null;
}

// Google Play only offers the trials the user can still get (the default
// option is the one with the longest free phase). The App Store lists the
// intro offer for everyone, so eligibility is checked there.
export const trialDaysOf = (product: TrialProduct, eligible = true): number | undefined => {
    const free = product.defaultOption?.freePhase;
    if (free) return free.billingPeriod.value * (DAYS_PER[free.billingPeriod.unit] ?? 0) || undefined;
    const intro = product.introPrice;
    if (intro && intro.price === 0 && eligible) return intro.periodNumberOfUnits * Math.max(1, intro.cycles) * (DAYS_PER[intro.periodUnit] ?? 0) || undefined;
    return undefined;
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
        async switchUser(id) {
            await Purchases.logIn({ appUserID: id });
        },
        async restore() {
            const { customerInfo } = await Purchases.restorePurchases();
            return toStatus(customerInfo.entitlements.active, customerInfo.managementURL);
        },
        async offer() {
            const offering = (await Purchases.getOfferings()).current;
            const plans: Plan[] = [];
            const eligibility = platform === 'ios' && offering
                ? await Purchases.checkTrialOrIntroductoryPriceEligibility({
                    productIdentifiers: [offering.annual, offering.monthly].flatMap(p => (p ? [p.product.identifier] : [])),
                }).catch(() => ({} as Record<string, { status: number }>))
                : {};
            for (const id of ['annual', 'monthly'] as const) {
                const pkg = offering?.[id];
                if (!pkg) continue;
                const { price, priceString, currencyCode } = pkg.product;
                plans.push({
                    id,
                    price: priceString,
                    perMonth: id === 'annual' ? money(price / 12, currencyCode) : priceString,
                    trialDays: trialDaysOf(pkg.product, platform !== 'ios' || eligibility[pkg.product.identifier]?.status === 2),
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
        async switchUser(id) {
            await purchases.changeUser(id);
        },
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

// After signing in or out: purchases follow the new user id. With carry,
// a subscription bought before having an account moves to the new one
// (the store transfers it on restore).
export const switchPremiumUser = async (carry = false) => {
    if (!backend && !carry) return;
    try {
        const b = await (backend ?? getBackend());
        await b.switchUser(await getUserId());
        actions.setPremium(await (carry ? b.restore() : b.status()));
    } catch {
        backend = null; // set up again on next use
    }
};

// Updates the cached status shown in the UI.
export const refreshPremium = async () => {
    const status = await (await getBackend()).status();
    actions.setPremium(status);
    return status;
};

// When the server says "not Premium" but this phone says Premium: make sure the
// store's purchases belong to the signed-in user id, then read the status again.
export const resyncPremium = async () => {
    try {
        const b = await getBackend();
        await b.switchUser(await getUserId());
        const status = await b.restore();
        actions.setPremium(status);
        return status.active;
    } catch {
        return false;
    }
};

export const restorePremium = async () => {
    const status = await (await getBackend()).restore();
    actions.setPremium(status);
    return status;
};

// Right after the plan is made, the free trial is offered once in the phone
// apps (where the stores give the free days): after the app tour when there
// is one (App.tsx), else straight away (Onboarding.tsx).
let trialOffer = false;
export const offerTrialSoon = () => { trialOffer = Capacitor.isNativePlatform() && premiumAvailable(); };
export const takeTrialOffer = () => {
    const offer = trialOffer;
    trialOffer = false;
    return offer;
};
