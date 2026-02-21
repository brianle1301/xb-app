import type { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.NODE_ENV !== "production";

const config: CapacitorConfig = {
  appId: "com.uos.xb",
  appName: "XB",
  server: {
    url: isDev
      ? "http://localhost:3000"
      : "https://xb-app-tawny.vercel.app",
    cleartext: isDev,
  },
};

export default config;
