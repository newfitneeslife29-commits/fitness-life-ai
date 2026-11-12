/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** URL del servidor online (obligatoria en las apps iOS/Android). */
  readonly VITE_SERVER_URL?: string;
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  readonly VITE_REVENUECAT_ANDROID_KEY?: string;
  readonly VITE_ADMOB_REWARDED_IOS?: string;
  readonly VITE_ADMOB_REWARDED_ANDROID?: string;
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
  readonly VITE_GOOGLE_IOS_CLIENT_ID?: string;
}
