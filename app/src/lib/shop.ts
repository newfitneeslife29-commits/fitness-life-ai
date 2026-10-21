import { isNative } from './native';

// The Fitness Life Edition clothing store (Shopify, at its own domain).
export const SHOP_URL = 'https://fitnesslifeedition.com';

// In the app's browser on phones (people come back with Done), a new tab on the web.
export const openShop = async () => {
    const url = `${SHOP_URL}/?utm_source=fitness-life-app&utm_medium=app`;
    if (!isNative()) {
        window.open(url, '_blank', 'noopener');
        return;
    }
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
};
