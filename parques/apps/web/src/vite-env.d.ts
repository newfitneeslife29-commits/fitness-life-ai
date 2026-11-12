/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** URL del servidor online (obligatoria en las apps iOS/Android). */
  readonly VITE_SERVER_URL?: string;
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  readonly VITE_REVENUECAT_ANDROID_KEY?: string;
}
