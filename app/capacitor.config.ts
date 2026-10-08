import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.fitnesslife.app',
    appName: 'Fitness Life',
    webDir: 'dist',
    backgroundColor: '#0b0d10',
    android: {
        backgroundColor: '#0b0d10',
    },
    ios: {
        backgroundColor: '#0b0d10',
        contentInset: 'never',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 1500,
            launchAutoHide: false, // hidden by the app once it has rendered
            backgroundColor: '#0b0d10',
            showSpinner: false,
        },
        LocalNotifications: {
            iconColor: '#f26b1d',
        },
    },
};

export default config;
