import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { MobileNav } from "@/components/mobile-nav";
import { LanguageProvider } from "@/lib/language-context";
import { getSession } from "@/server/rpc/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return { user: session.user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background pb-16">
        <Outlet />
        <MobileNav />
      </div>
    </LanguageProvider>
  );
}
