import { isNative } from './native';

// The Fitness Life Edition clothing store (Shopify, at its own domain).
export const SHOP_URL = 'https://fitnesslifeedition.com';

// App users get this store discount: the link applies it at checkout on its own.
export const SHOP_CODE = 'APP10';

// In the app's browser on phones (people come back with Done), a new tab on the web.
// Shopify's /discount/<code> link saves the code for checkout, then goes to `redirect`.
export const openShop = async () => {
    const landing = '/?utm_source=fitness-life-app&utm_medium=app';
    const url = `${SHOP_URL}/discount/${SHOP_CODE}?redirect=${encodeURIComponent(landing)}`;
    if (!isNative()) {
        window.open(url, '_blank', 'noopener');
        return;
    }
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
};
