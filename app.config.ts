// app.config.ts
import "dotenv/config";
import type { ExpoConfig } from "@expo/config";

const ENV = process.env.APP_ENV ?? "dev";

const ANDROID_PACKAGE = ENV === "prod" ? "com.viu.app" : "com.viu.app.dev";
const IOS_BUNDLE_ID  = ENV === "prod" ? "com.viu.app" : "com.viu.app.dev";
const SCHEME         = ENV === "prod" ? "com.viu.app" : "com.viu.app.dev";

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const config: ExpoConfig = {
  name: ENV === "prod" ? "VIU" : "VIU (Dev)",
  slug: "viu-mobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  scheme: SCHEME,

  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: IOS_BUNDLE_ID,
  },

  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },

  web: { favicon: "./assets/favicon.png" },

  extra: {
    appEnv: ENV,

    // 🔹 adicionado: EAS Project ID (fixa o link do projeto na cloud)
    eas: {
      projectId: "a47ca354-caba-4fdd-ae8d-998c645961ee",
    },

    // (opcional) expõe também suas envs se quiser acessar via Constants.expoConfig?.extra
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  },

  experiments: {
    typedRoutes: false,
  },
};

export default config;
