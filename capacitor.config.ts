import type { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.NODE_ENV !== "production";

const config: CapacitorConfig = {
  appId: "uk.ac.wellthlab.xb",
  appName: "XB",
  webDir: ".output/public",
  server: {
    url: isDev ? "http://localhost:3000" : "https://xb-app-tawny.vercel.app",
    cleartext: isDev,
  },
};

export default config;
