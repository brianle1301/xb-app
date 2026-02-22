import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { MobileNav } from "@/components/mobile-nav";
import { hashContent } from "@/lib/hash";
import { LanguageProvider } from "@/lib/language-context";
import { documentBySlugQuery } from "@/queries/documents";
import { getSession } from "@/server/rpc/auth";
import { registerDevice } from "@/server/rpc/devices";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    // Check post-registration document (client-side only due to localStorage)
    if (typeof window !== "undefined") {
      const postRegDoc = await context.queryClient.ensureQueryData(
        documentBySlugQuery("post-registration"),
      );

      if (postRegDoc?.status === "published") {
        const currentHash = hashContent(postRegDoc.content);
        const seenHash = localStorage.getItem("postRegistrationSeenHash");

        if (seenHash !== currentHash) {
          throw redirect({
            to: "/$slug",
            params: { slug: "post-registration" },
            search: { redirect: "/" },
          });
        }
      }
    }

    return { user: session.user };
  },
  component: AppLayout,
});

function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function setup() {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      PushNotifications.addListener("registration", async (token) => {
        const platform = Capacitor.getPlatform() as "ios" | "android";
        await registerDevice({ data: { token: token.value, platform } });
      });

      PushNotifications.addListener("registrationError", () => {});

      await PushNotifications.register();
    }

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
}

function AppLayout() {
  usePushNotifications();

  return (
    <LanguageProvider>
      <div className="h-screen bg-background pt-[env(safe-area-inset-top)] flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
        <MobileNav />
      </div>
    </LanguageProvider>
  );
}
