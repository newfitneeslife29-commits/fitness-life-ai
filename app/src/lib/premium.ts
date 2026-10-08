import { Capacitor } from '@capacitor/core';
import { actions } from '../store/store';
import type { PremiumStatus } from '../store/types';
import { aiAvailable, getUserId } from './ai';

// Fitness Life Premium: one monthly subscription (4.99 USD, priced in App
// Store Connect, Google Play Console and RevenueCat Web Billing).
// RevenueCat unifies the three stores behind one entitlement, `premium`.
// The app user id is the anonymous Supabase id, so the AI function can
// check the same subscription server-side.

export const ENTITLEMENT = 'premium';
// Shown until the store answers with the localized price.
export const FALLBACK_PRICE = '4,99 US$';
// AI uses per month; keep in sync with FREE_MONTHLY_LIMIT / PREMIUM_MONTHLY_LIMIT
// in supabase/functions/nutrition-coach (the server is what enforces them).
export const FREE_AI_USES = 5;
export const PREMIUM_AI_USES = 100;

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

export interface Offer {
    price: string;
    buy: () => Promise<boolean>; // false: the user cancelled
}

interface Backend {
    offer(): Promise<Offer | null>;
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
            const pkg = offering?.monthly ?? offering?.availablePackages[0];
            if (!pkg) return null;
            return {
                price: pkg.product.priceString,
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
            };
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
            const pkg = offering?.monthly ?? offering?.availablePackages[0];
            if (!pkg) return null;
            return {
                price: pkg.webBillingProduct.price?.formattedPrice ?? FALLBACK_PRICE,
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
            };
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
