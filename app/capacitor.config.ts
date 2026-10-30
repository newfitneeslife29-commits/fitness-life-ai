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
        // With the app open, a notification plays its sound while the app shows it as a note.
        PushNotifications: {
            presentationOptions: ['sound'],
        },
        LocalNotifications: {
            smallIcon: 'ic_stat_notify', // res/drawable/ic_stat_notify.xml
            iconColor: '#f26b1d',
        },
    },
};

export default config;
